'use strict';

// FILE: worker/src/worker.js
// Dynamic BullMQ worker — reads active LinkedInAccounts from DB at startup,
// creates one Worker per account. New accounts registered via registerAccountWorker().

const { Worker }               = require('bullmq');
const { createRedisClient }    = require('./redisClient');
const { getPrisma }            = require('./db/prisma');

const { verifySession }         = require('./actions/login');
const { readMessages }          = require('./actions/readMessages');
const { readThread }            = require('./actions/readThread');
const { sendMessage }           = require('./actions/sendMessage');
const { sendMessageNew }        = require('./actions/sendMessageNew');
const { sendConnectionRequest } = require('./actions/connect');
const { searchPeople }          = require('./actions/searchPeople');
const { captureStorageState }   = require('./actions/captureStorageState');
const { syncAccount, syncAllAccounts } = require('./services/messageSyncService');
const { checkSessionHealth }    = require('./services/sessionHealthService');
const { runConnectionDelta }    = require('./services/connectionDeltaService');
const { scrapeNotifications }   = require('./actions/scrapeNotifications');
const { startRealtimeListener } = require('./services/realtimeHook');

const CONCURRENCY = 1;

// Map of accountId → BullMQ Worker instance
const activeWorkers = new Map();

/**
 * Build the job handler for a specific LinkedIn account.
 */
function buildHandler(linkedInAccountId) {
  return async (job) => {
    const { name, data } = job;
    console.log(`[Worker:${linkedInAccountId}] Processing job ${job.id}: ${name}`);

    switch (name) {
      case 'verifySession':
        return verifySession({ ...data, linkedInAccountId });
      case 'readMessages':
        return readMessages({ ...data, linkedInAccountId });
      case 'readThread':
        return readThread({ ...data, linkedInAccountId });
      case 'sendMessage':
        return sendMessage({ ...data, linkedInAccountId });
      case 'sendMessageNew':
        return sendMessageNew({ ...data, linkedInAccountId });
      case 'sendConnectionRequest':
        return sendConnectionRequest({ ...data, linkedInAccountId });
      case 'searchPeople':
        return searchPeople({ ...data, linkedInAccountId });
      case 'captureStorageState':
        return captureStorageState({ ...data, linkedInAccountId });
      case 'messageSync':
        return syncAccount(linkedInAccountId, data.proxyUrl);
      case 'scrapeConnections':
        return runConnectionDelta(linkedInAccountId, data.userId, data.proxyUrl);
      case 'scrapeNotifications':
        return scrapeNotifications({ linkedInAccountId, userId: data.userId, proxyUrl: data.proxyUrl });
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  };
}

/**
 * Register a BullMQ Worker for a single LinkedIn account.
 * Idempotent — silently skips if a worker is already registered.
 *
 * @param {string} linkedInAccountId
 */
function registerAccountWorker(linkedInAccountId) {
  if (activeWorkers.has(linkedInAccountId)) return;

  const worker = new Worker(
    `linkedin-jobs:${linkedInAccountId}`,
    buildHandler(linkedInAccountId),
    {
      connection:    createRedisClient(),
      concurrency:   CONCURRENCY,
      lockDuration:  120_000,
      lockRenewTime:  60_000,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker:${linkedInAccountId}] Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker:${linkedInAccountId}] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[Worker:${linkedInAccountId}] Worker error:`, err);
  });

  activeWorkers.set(linkedInAccountId, worker);
  console.log(`[Worker] Registered worker for account ${linkedInAccountId}`);
  
  // Start persistent realtime WS/XHR interception for CTI sync
  const prisma = getPrisma();
  prisma.linkedInAccount.findUnique({ where: { id: linkedInAccountId }, select: { userId: true } })
    .then(acc => {
      if (acc) startRealtimeListener(linkedInAccountId, acc.userId, process.env.PROXY_URL || null);
    })
    .catch(err => console.error('[Worker] Failed to start realtime listener:', err.message));
}

/**
 * Start all workers by querying DB for active LinkedInAccounts.
 * Also schedules recurring background jobs.
 */
async function startWorker() {
  const prisma = getPrisma();

  // Load all active accounts from DB (not from env)
  let accounts = [];
  try {
    accounts = await prisma.linkedInAccount.findMany({
      where: { status: 'active' },
      select: { id: true, userId: true },
    });
  } catch (err) {
    console.error('[Worker] Failed to load accounts from DB — starting with 0 accounts:', err.message);
  }

  for (const account of accounts) {
    registerAccountWorker(account.id);
  }

  console.log(`[Worker] Started ${accounts.length} per-account workers (concurrency ${CONCURRENCY} each).`);

  // Schedule background jobs
  await scheduleMessageSync();
  await scheduleSessionHealthCheck();
  await scheduleNotificationScrape();

  return activeWorkers;
}

// ── Recurring job schedulers ─────────────────────────────────────────────────

async function scheduleMessageSync() {
  const { getQueue } = require('./queue');
  const syncIntervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || '10', 10);
  const proxyUrl = process.env.PROXY_URL || null;

  // We use a single "global" queue for the sync orchestrator job.
  // The syncAllAccounts function will query the DB for active accounts.
  const queue = getQueue('global');

  try {
    const existing = await queue.getRepeatableJobs();
    for (const job of existing) {
      if (job.name === 'messageSyncAll') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'messageSyncAll',
      { proxyUrl },
      {
        repeat: { pattern: `*/${syncIntervalMinutes} * * * *` },
        jobId:  'messageSyncAll-recurring',
      }
    );

    // Trigger initial sync after 30 seconds
    setTimeout(async () => {
      await queue.add('messageSyncAll', { proxyUrl }, { jobId: `messageSyncAll-init-${Date.now()}` });
      console.log('[Worker] Triggered initial message sync');
    }, 30_000);

    console.log(`[Worker] Scheduled messageSyncAll every ${syncIntervalMinutes} minutes`);
  } catch (err) {
    console.error('[Worker] Failed to schedule messageSyncAll:', err);
  }

  // Register a single worker for the global queue to handle orchestrator jobs
  const globalWorker = new Worker(
    'linkedin-jobs:global',
    async (job) => {
      if (job.name === 'messageSyncAll') {
        return syncAllAccounts(job.data.proxyUrl);
      }
    },
    { connection: createRedisClient(), concurrency: 1 }
  );
  globalWorker.on('error', (err) => console.error('[Worker:global]', err));
}

async function scheduleSessionHealthCheck() {
  // Run health checks via setInterval (every 30 minutes) rather than BullMQ
  // to avoid polluting the job queue with repeated health-check job history.
  const intervalMs = 30 * 60 * 1000;

  setInterval(async () => {
    try {
      const prisma = getPrisma();
      const accounts = await prisma.linkedInAccount.findMany({
        where:  { status: 'active' },
        select: { id: true, userId: true },
      });

      for (const account of accounts) {
        await checkSessionHealth(account.id, account.userId, process.env.PROXY_URL || null)
          .catch((err) => console.error(`[SessionHealth] Error for ${account.id}:`, err.message));
      }
    } catch (err) {
      console.error('[SessionHealth] Scheduler error:', err);
    }
  }, intervalMs);

  console.log('[Worker] Session health checks scheduled every 30 minutes');
}

async function scheduleNotificationScrape() {
  const { getQueue } = require('./queue');
  const intervalMinutes = parseInt(process.env.NOTIFICATION_SCRAPE_INTERVAL_MINUTES || '5', 10);
  const proxyUrl = process.env.PROXY_URL || null;

  const queue = getQueue('notifications');

  try {
    const existing = await queue.getRepeatableJobs();
    for (const job of existing) {
      if (job.name === 'scrapeAllNotifications') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'scrapeAllNotifications',
      { proxyUrl },
      {
        repeat: { pattern: `*/${intervalMinutes} * * * *` },
        jobId:  'scrapeAllNotifications-recurring',
      }
    );

    console.log(`[Worker] Scheduled notification scrape every ${intervalMinutes} minutes`);
  } catch (err) {
    console.error('[Worker] Failed to schedule notification scrape:', err);
  }

  const notifWorker = new Worker(
    'linkedin-jobs:notifications',
    async (job) => {
      if (job.name === 'scrapeAllNotifications') {
        const prisma = getPrisma();
        const accounts = await prisma.linkedInAccount.findMany({
          where:  { status: 'active' },
          select: { id: true, userId: true },
        });
        for (const account of accounts) {
          await scrapeNotifications({
            linkedInAccountId: account.id,
            userId:            account.userId,
            proxyUrl:          job.data.proxyUrl,
          }).catch((err) => console.error(`[Notifications] Error for ${account.id}:`, err.message));
        }
      }
    },
    { connection: createRedisClient(), concurrency: 1 }
  );
  notifWorker.on('error', (err) => console.error('[Worker:notifications]', err));
}

module.exports = { startWorker, registerAccountWorker };
