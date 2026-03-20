'use strict';

const { Worker } = require('bullmq');
const { createRedisClient }             = require('./redisClient');

const { verifySession }         = require('./actions/login');
const { readMessages }          = require('./actions/readMessages');
const { readThread }            = require('./actions/readThread');
const { sendMessage }           = require('./actions/sendMessage');
const { sendMessageNew }        = require('./actions/sendMessageNew');
const { sendConnectionRequest } = require('./actions/connect');
const { searchPeople }          = require('./actions/searchPeople');
const { syncAllAccounts }       = require('./services/messageSyncService');

// Hard-clamped to 1: LinkedIn will flag parallel browser sessions from the same IP/account.
const CONCURRENCY = 1;

function startWorker() {
  const worker = new Worker(
    'linkedin-jobs',  // MUST match queue name in queue.js
    async (job) => {
      const { name, data } = job;
      console.log(`[Worker] Processing job ${job.id}: ${name}`);

      switch (name) {
        case 'verifySession':         return verifySession(data);
        case 'readMessages':          return readMessages(data);
        case 'readThread':            return readThread(data);
        case 'sendMessage':           return sendMessage(data);
        case 'sendMessageNew':        return sendMessageNew(data);
        case 'sendConnectionRequest': return sendConnectionRequest(data);
        case 'searchPeople':          return searchPeople(data);
        case 'messageSync':           return syncAllAccounts(data.proxyUrl);
        default:
          throw new Error(`Unknown job type: ${name}`);
      }
    },
    {
      connection:    createRedisClient(), // dedicated connection for BullMQ worker
      concurrency:   CONCURRENCY,
      lockDuration:  120_000, // auto-release lock after 2 min if no heartbeat (crash recovery)
      lockRenewTime:  60_000, // renew every 60 s for long-running jobs
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} (${job?.name}) failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log(`[Worker] Started with concurrency ${CONCURRENCY}`);
  
  // Schedule background message sync (every 10 minutes, staggered between accounts)
  scheduleMessageSync();
  
  return worker;
}

/**
 * Schedule recurring message sync job
 * Syncs every 10 minutes to respect rate limits (6 syncs/hour < 30 reads/hour)
 */
async function scheduleMessageSync() {
  const { getQueue } = require('./queue');
  const queue = getQueue();
  
  const syncIntervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || '10', 10);
  const proxyUrl = process.env.PROXY_URL || null;

  try {
    // Remove any existing message sync jobs
    const existingJobs = await queue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (job.name === 'messageSync') {
        await queue.removeRepeatableByKey(job.key);
        console.log('[Worker] Removed existing messageSync job');
      }
    }

    // Add recurring message sync job
    await queue.add(
      'messageSync',
      { proxyUrl },
      {
        repeat: {
          pattern: `*/${syncIntervalMinutes} * * * *`, // Every N minutes
        },
        jobId: 'messageSync-recurring',
      }
    );

    console.log(`[Worker] Scheduled message sync every ${syncIntervalMinutes} minutes`);

    // Trigger initial sync after 30 seconds (give system time to start)
    setTimeout(async () => {
      await queue.add('messageSync', { proxyUrl }, { jobId: 'messageSync-initial' });
      console.log('[Worker] Triggered initial message sync');
    }, 30000);

  } catch (error) {
    console.error('[Worker] Failed to schedule message sync:', error);
  }
}

module.exports = { startWorker };
