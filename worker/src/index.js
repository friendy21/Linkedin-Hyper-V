'use strict';

// FILE: worker/src/index.js
// Express API for the worker daemon.
// Provides endpoints for LinkedIn account management and job dispatch.
// ACCOUNT_IDS env var is removed — accounts are read from PostgreSQL.

const express  = require('express');
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getQueue, getQueueEvents } = require('./queue');
const { startWorker, registerAccountWorker } = require('./worker');
const { getLimits }  = require('./rateLimit');
const { getPrisma }  = require('./db/prisma');
const {
  sanitizeText,
  validateId,
  validateProfileUrl,
  parseLimit,
} = require('./sanitizers');
const { saveStorageState }  = require('./sessionStorage');
const { scrapeAllConnections } = require('./services/connectionDeltaService');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// ── Global request timeout ──────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setTimeout(130_000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'Request timed out' });
  });
  next();
});

// ── Auth middleware ──────────────────────────────────────────────────────────

function requireApiKey(req, res, next) {
  const secret = process.env.API_SECRET;
  if (!secret) return res.status(500).json({ error: 'API_SECRET not configured' });
  const provided = req.headers['x-api-key'] || '';
  if (
    provided.length !== secret.length ||
    !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Health (no auth) ─────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use(requireApiKey);

const { getRedis } = require('./redisClient');
const exportRoutes = require('./routes/export');
const { syncAccount, syncAllAccounts } = require('./services/messageSyncService');

app.use('/export', exportRoutes);

// ── Job helper ───────────────────────────────────────────────────────────────

async function runJob(name, data, timeoutMs = 120_000) {
  const accountId   = data.linkedInAccountId || data.accountId || 'default';
  const queue       = getQueue(accountId);
  const queueEvents = getQueueEvents(accountId);

  const jobId = `${name}:${accountId}:${Math.floor(Date.now() / 30_000)}`;

  const job = await queue.add(name, data, {
    jobId,
    removeOnComplete: { count: 50 },
    removeOnFail:     { count: 100 },
    attempts:         2,
    backoff:          { type: 'exponential', delay: 5000 },
  });

  try {
    return await job.waitUntilFinished(queueEvents, timeoutMs);
  } catch (err) {
    if (err.message?.includes('timed out')) {
      await job.remove().catch(() => {});
      const toErr  = new Error(`Job ${name} timed out after ${timeoutMs}ms`);
      toErr.status = 504;
      throw toErr;
    }
    const failErr  = new Error(job.failedReason || err.message || 'Job failed');
    failErr.code   = job.data?.code;
    failErr.status = job.data?.status || 500;
    throw failErr;
  }
}

// ── Manual sync trigger ──────────────────────────────────────────────────────

app.post('/sync/messages', async (req, res) => {
  try {
    const { linkedInAccountId } = req.body;
    const proxyUrl = process.env.PROXY_URL || null;

    if (linkedInAccountId) {
      // Need userId for the account
      const prisma  = getPrisma();
      const account = await prisma.linkedInAccount.findUnique({
        where:  { id: linkedInAccountId },
        select: { userId: true },
      });
      if (!account) return res.status(404).json({ error: 'Account not found' });

      syncAccount(linkedInAccountId, account.userId, proxyUrl)
        .then((s) => console.log('[API] Manual sync completed:', s))
        .catch((e) => console.error('[API] Manual sync failed:', e));

      res.json({ success: true, message: `Sync started for account ${linkedInAccountId}` });
    } else {
      syncAllAccounts(proxyUrl)
        .then((s) => console.log('[API] Manual sync completed:', s))
        .catch((e) => console.error('[API] Manual sync failed:', e));
      res.json({ success: true, message: 'Sync started for all accounts' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LinkedIn Account Management ──────────────────────────────────────────────

/**
 * POST /linkedin-accounts/connect
 * Called by Next.js BFF when user clicks "Connect LinkedIn Account".
 * Expects: { userId }
 * Launches a captureStorageState job (long-running), saves result to DB.
 * Times out at 5.5 minutes (slightly more than the 5-minute Playwright window).
 */
app.post('/linkedin-accounts/connect', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const prisma = getPrisma();

  // Create a pending account record first
  let account;
  try {
    account = await prisma.linkedInAccount.create({
      data: { userId, status: 'pending' },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create account record: ' + err.message });
  }

  const proxyUrl = process.env.PROXY_URL || null;

  try {
    console.log(`[API] Starting captureStorageState for user ${userId}, account ${account.id}`);

    // Dispatch job and wait — 5.5 minute timeout
    const storageState = await runJob(
      'captureStorageState',
      { linkedInAccountId: account.id, proxyUrl },
      330_000  // 5.5 minutes
    );

    // Save the encrypted storageState to DB
    await saveStorageState(account.id, userId, storageState);

    // Try to extract profile info from storageState cookies
    let displayName       = '';
    let linkedinProfileId = '';
    try {
      const liCookie = (storageState.cookies || []).find((c) => c.name === 'li_at' || c.name === 'JSESSIONID');
      // Profile ID is grabbed from localStorage if available
      const origins = storageState.origins || [];
      for (const origin of origins) {
        const profileItem = (origin.localStorage || []).find((l) => l.name === 'voyagerCurrentMemberId' || l.name === 'currentMemberId');
        if (profileItem) { linkedinProfileId = profileItem.value; break; }
      }
    } catch (_) {}

    // Update account record
    const updated = await prisma.linkedInAccount.update({
      where: { id: account.id },
      data: {
        status:            'active',
        displayName:       displayName || `LinkedIn Account`,
        linkedinProfileId: linkedinProfileId || null,
        lastSyncedAt:      new Date(),
      },
      select: { id: true, displayName: true, linkedinProfileId: true, status: true, lastSyncedAt: true, createdAt: true },
    });

    // Register worker for this new account
    registerAccountWorker(account.id);

    // Trigger initial connection scrape in background via BullMQ
    const { getQueue } = require('./queue');
    const queue = getQueue('global');
    queue.add('scrapeConnections', { linkedInAccountId: account.id, userId, proxyUrl })
      .catch((err) => console.error(`[API] Failed to queue initial connection scrape:`, err.message));

    res.json({ success: true, account: updated });
  } catch (err) {
    // Clean up the pending account if capture failed
    await prisma.linkedInAccount.delete({ where: { id: account.id } }).catch(() => {});

    const status = err.status || 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

/**
 * GET /linkedin-accounts
 * List all LinkedIn accounts for a given userId.
 * userId is passed via X-User-Id header from the Next.js BFF.
 */
app.get('/linkedin-accounts', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(400).json({ error: 'X-User-Id header is required' });

  try {
    const prisma    = getPrisma();
    const accounts  = await prisma.linkedInAccount.findMany({
      where:  { userId },
      select: {
        id: true, displayName: true, linkedinProfileId: true,
        status: true, lastSyncedAt: true, sessionExpiresAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

/**
 * DELETE /linkedin-accounts/:id
 * Remove a LinkedIn account. Ownership is verified via X-User-Id header.
 */
app.delete('/linkedin-accounts/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { id } = req.params;
  if (!userId) return res.status(400).json({ error: 'X-User-Id header is required' });

  try {
    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findFirst({ where: { id, userId } });
    if (!account) return res.status(404).json({ error: 'Account not found or not owned by this user' });

    // Stop real-time listener if active
    const { stopRealtimeListener } = require('./services/realtimeHook');
    await stopRealtimeListener(id);

    // Pause queue and clear context
    const { getQueue } = require('./queue');
    await getQueue(id).pause();
    const { cleanupContext } = require('./browser');
    await cleanupContext(id);

    await prisma.linkedInAccount.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

/**
 * POST /linkedin-accounts/:id/reconnect
 * Re-runs the captureStorageState flow for an expired account.
 */
app.post('/linkedin-accounts/:id/reconnect', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { id } = req.params;
  if (!userId) return res.status(400).json({ error: 'X-User-Id header is required' });

  try {
    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findFirst({ where: { id, userId } });
    if (!account) return res.status(404).json({ error: 'Account not found or not owned by this user' });

    // Mark as pending during reconnect
    await prisma.linkedInAccount.update({ where: { id }, data: { status: 'pending' } });

    const proxyUrl = process.env.PROXY_URL || null;

    try {
      const storageState = await runJob('captureStorageState', { linkedInAccountId: id, proxyUrl }, 330_000);
      await saveStorageState(id, userId, storageState);

      const updated = await prisma.linkedInAccount.update({
        where: { id },
        data:  { status: 'active', lastSyncedAt: new Date() },
        select: { id: true, displayName: true, status: true, lastSyncedAt: true },
      });

      registerAccountWorker(id);
      res.json({ success: true, account: updated });
    } catch (err) {
      await prisma.linkedInAccount.update({ where: { id }, data: { status: 'expired' } }).catch(() => {});
      throw err;
    }
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

// ── Rate limits ──────────────────────────────────────────────────────────────

app.get('/accounts/:accountId/limits', async (req, res) => {
  try {
    const accountId = validateId(req.params.accountId, { field: 'accountId' });
    const limits = await getLimits(accountId);
    res.json(limits);
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

// ── LinkedIn action jobs ─────────────────────────────────────────────────────

app.post('/accounts/:accountId/verify', async (req, res) => {
  try {
    // Fetch userId for the account
    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findUnique({
      where: { id: req.params.accountId }, select: { userId: true },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await runJob('verifySession', {
      linkedInAccountId: req.params.accountId,
      userId:            account.userId,
      proxyUrl:          process.env.PROXY_URL || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

app.get('/messages/inbox', async (req, res) => {
  try {
    const linkedInAccountId = validateId(req.query.linkedInAccountId || req.query.accountId, { field: 'linkedInAccountId' });
    const limit = parseLimit(req.query.limit, 20);

    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findUnique({
      where: { id: linkedInAccountId }, select: { userId: true },
    });

    const result = await runJob('readMessages', {
      linkedInAccountId,
      userId:   account?.userId,
      limit,
      proxyUrl: process.env.PROXY_URL || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

app.get('/messages/thread', async (req, res) => {
  try {
    const linkedInAccountId = validateId(req.query.linkedInAccountId || req.query.accountId, { field: 'linkedInAccountId' });
    const chatId = validateId(req.query.chatId, { field: 'chatId' });
    const limit  = parseLimit(req.query.limit, 100);
    const offset = parseInt(req.query.offset) || 0;

    const prisma = getPrisma();
    const messages = await prisma.message.findMany({
      where:   { conversationId: chatId, linkedInAccountId },
      orderBy: { sentAt: 'asc' },
      skip:    offset,
      take:    limit,
    });

    res.json({
      items: messages.map((m) => ({
        id:         m.id,
        text:       m.text,
        sentAt:     new Date(m.sentAt).getTime(),
        sentByMe:   m.isSentByMe,
        senderName: m.senderName,
      })),
      cursor:  null,
      hasMore: messages.length === limit,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

app.post('/messages/send', async (req, res) => {
  try {
    const linkedInAccountId = validateId(req.body?.linkedInAccountId || req.body?.accountId, { field: 'linkedInAccountId' });
    const chatId = validateId(req.body?.chatId, { field: 'chatId' });
    const text   = sanitizeText(req.body?.text, { maxLength: 3000 });
    if (!text) return res.status(400).json({ error: 'text is required' });

    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findUnique({ where: { id: linkedInAccountId }, select: { userId: true } });

    const result = await runJob('sendMessage', {
      linkedInAccountId, userId: account?.userId, chatId, text,
      proxyUrl: process.env.PROXY_URL || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

app.post('/messages/send-new', async (req, res) => {
  try {
    const linkedInAccountId = validateId(req.body?.linkedInAccountId || req.body?.accountId, { field: 'linkedInAccountId' });
    const profileUrl = validateProfileUrl(req.body?.profileUrl);
    const text       = sanitizeText(req.body?.text, { maxLength: 3000 });
    if (!text) return res.status(400).json({ error: 'text is required' });

    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findUnique({ where: { id: linkedInAccountId }, select: { userId: true } });

    const result = await runJob('sendMessageNew', {
      linkedInAccountId, userId: account?.userId, profileUrl, text,
      proxyUrl: process.env.PROXY_URL || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

app.post('/connections/send', async (req, res) => {
  try {
    const linkedInAccountId = validateId(req.body?.linkedInAccountId || req.body?.accountId, { field: 'linkedInAccountId' });
    const profileUrl = validateProfileUrl(req.body?.profileUrl);
    const note       = req.body?.note == null ? '' : req.body.note;

    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findUnique({ where: { id: linkedInAccountId }, select: { userId: true } });

    const result = await runJob('sendConnectionRequest', {
      linkedInAccountId, userId: account?.userId, profileUrl, note,
      proxyUrl: process.env.PROXY_URL || null,
    }, 90_000);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

// ── Unified inbox ────────────────────────────────────────────────────────────

app.get('/inbox/unified', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const limit  = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const prisma = getPrisma();

    // Build where clause — either for a specific user or all accounts if no userId
    const whereClause = userId
      ? { linkedInAccount: { userId } }
      : {};

    const conversations = await prisma.conversation.findMany({
      where:   whereClause,
      orderBy: { lastMessageAt: 'desc' },
      skip:    offset,
      take:    limit,
      include: { linkedInAccount: { select: { id: true, displayName: true, userId: true } } },
    });

    res.json({
      conversations: conversations.map((conv) => ({
        conversationId:   conv.id,
        linkedInAccountId: conv.linkedInAccountId,
        accountDisplay:   conv.linkedInAccount?.displayName || '',
        participant: {
          name:       conv.participantName,
          profileUrl: conv.participantProfileUrl || '',
          avatarUrl:  conv.participantAvatarUrl  || '',
        },
        lastMessage: {
          text:      conv.lastMessageText,
          sentAt:    new Date(conv.lastMessageAt).getTime(),
          sentByMe:  conv.lastMessageSentByMe,
        },
        unreadCount: 0,
        messages:    [],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

// ── Notifications ────────────────────────────────────────────────────────────

app.get('/notifications', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(400).json({ error: 'X-User-Id header is required' });

    const limit  = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const prisma = getPrisma();
    const notifications = await prisma.notification.findMany({
      where:   { linkedInAccount: { userId } },
      orderBy: { receivedAt: 'desc' },
      skip:    offset,
      take:    limit,
      select: {
        id: true, type: true, title: true, body: true,
        linkedinUrl: true, readAt: true, receivedAt: true,
        linkedInAccountId: true,
      },
    });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

// ── Stats ────────────────────────────────────────────────────────────────────

app.get('/stats/:accountId/summary', async (req, res) => {
  try {
    const { accountId } = req.params;
    const redis = getRedis();
    const key   = `activity:log:${accountId}`;
    const total = await redis.llen(key).catch(() => 0);
    res.json({ accountId, totalActivity: total });
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

app.get('/stats/:accountId/activity', async (req, res) => {
  try {
    const accountId = validateId(req.params.accountId, { field: 'accountId' });
    const page  = parseInt(req.query.page  ?? '0',  10);
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);
    const redis = getRedis();
    const key   = `activity:log:${accountId}`;
    const total = await redis.llen(key);
    const raw   = await redis.lrange(key, page * limit, page * limit + limit - 1);

    const entries = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    res.json({ entries, total });
  } catch (err) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  }
});

app.get('/people/search', async (req, res) => {
  try {
    const linkedInAccountId = validateId(req.query.linkedInAccountId || req.query.accountId, { field: 'linkedInAccountId' });
    const q     = sanitizeText(req.query.q, { maxLength: 200 });
    const limit = parseInt(req.query.limit || '10', 10);
    if (!q) return res.status(400).json({ error: 'q is required' });

    const prisma  = getPrisma();
    const account = await prisma.linkedInAccount.findUnique({ where: { id: linkedInAccountId }, select: { userId: true } });

    const result = await runJob('searchPeople', {
      linkedInAccountId, userId: account?.userId, query: q, limit,
      proxyUrl: process.env.PROXY_URL || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const http = require('http');
const { initializeWebSocket } = require('./utils/websocket');

startWorker().then(() => {
  console.log('[Worker] All account workers started.');
}).catch((err) => {
  console.error('[Worker] Failed to start workers:', err);
});

const server = http.createServer(app);
initializeWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Worker API listening on port ${PORT}`);
  console.log('[WebSocket] WebSocket server ready');
});
