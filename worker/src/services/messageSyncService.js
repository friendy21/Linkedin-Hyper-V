// FILE: worker/src/services/messageSyncService.js
// Message synchronization service — fetches conversations from LinkedIn and stores in DB.
// Accounts are read from PostgreSQL (not from ACCOUNT_IDS env).

'use strict';

const { readMessages }      = require('../actions/readMessages');
const { readThread }        = require('../actions/readThread');
const { getPrisma }         = require('../db/prisma');
const { emitInboxUpdate, emitNewMessage } = require('../utils/websocket');
const { getRedis }          = require('../redisClient');

/**
 * Sync messages for a single LinkedIn account.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId            - Used for scoped socket events
 * @param {string|null} proxyUrl
 */
async function syncAccount(linkedInAccountId, userId, proxyUrl = null) {
  console.log(`[MessageSync] Starting sync for account: ${linkedInAccountId}`);

  const prisma = getPrisma();
  const stats = {
    linkedInAccountId,
    conversationsProcessed: 0,
    newMessages:            0,
    updatedConversations:   0,
    errors:                 [],
    startedAt:              new Date(),
  };

  try {
    // Fetch conversations from LinkedIn via Playwright action
    const inboxData = await readMessages({ linkedInAccountId, proxyUrl, limit: 50 });

    if (!inboxData || !inboxData.items || inboxData.items.length === 0) {
      console.log(`[MessageSync] No conversations for ${linkedInAccountId}`);
      return stats;
    }

    console.log(`[MessageSync] Found ${inboxData.items.length} conversations for ${linkedInAccountId}`);

    for (const conv of inboxData.items) {
      try {
        stats.conversationsProcessed++;

        const conversationId        = conv.id;
        const participantName       = conv.participants?.[0]?.name || 'Unknown';
        const participantProfileUrl = conv.participants?.[0]?.profileUrl || null;
        const participantAvatarUrl  = conv.participants?.[0]?.avatarUrl  || null;

        // Upsert conversation
        await prisma.conversation.upsert({
          where:  { id: conversationId },
          create: {
            id: conversationId,
            linkedInAccountId,
            participantName,
            participantProfileUrl,
            participantAvatarUrl,
            lastMessageAt:      new Date(conv.lastMessage?.createdAt || conv.createdAt || Date.now()),
            lastMessageText:    conv.lastMessage?.text || '',
            lastMessageSentByMe: conv.lastMessage?.senderId === '__self__',
          },
          update: {
            participantName,
            participantProfileUrl,
            participantAvatarUrl,
            lastMessageAt:      new Date(conv.lastMessage?.createdAt || conv.createdAt || Date.now()),
            lastMessageText:    conv.lastMessage?.text || '',
            lastMessageSentByMe: conv.lastMessage?.senderId === '__self__',
          },
        });
        stats.updatedConversations++;

        // Fetch individual thread messages
        const threadData = await readThread({ linkedInAccountId, chatId: conversationId, proxyUrl, limit: 100 });

        if (threadData?.items?.length > 0) {
          const beforeCount = await prisma.message.count({ where: { conversationId } });

          for (const msg of threadData.items) {
            try {
              await prisma.message.upsert({
                where: {
                  conversationId_sentAt_text: {
                    conversationId,
                    sentAt: new Date(msg.createdAt || Date.now()),
                    text:   msg.text || '',
                  },
                },
                create: {
                  conversationId,
                  linkedInAccountId,
                  senderId:         msg.senderId   || '__unknown__',
                  senderName:       msg.senderName || 'Unknown',
                  text:             msg.text       || '',
                  sentAt:           new Date(msg.createdAt || Date.now()),
                  isSentByMe:       msg.senderId === '__self__',
                  linkedinMessageId: msg.id || null,
                },
                update: {},  // no-op on conflict (dedup)
              });
            } catch (msgErr) {
              if (!msgErr.message?.includes('Unique constraint')) {
                console.error(`[MessageSync] Message upsert error:`, msgErr.message);
                stats.errors.push({ conversationId, error: msgErr.message });
              }
            }
          }

          const afterCount = await prisma.message.count({ where: { conversationId } });
          const actualNew  = afterCount - beforeCount;

          if (actualNew > 0) {
            stats.newMessages += actualNew;
            emitNewMessage(userId, {
              linkedInAccountId,
              conversationId,
              participantName,
              newMessagesCount: actualNew,
            });
          }
        }

        await delay(500, 1000);
      } catch (convErr) {
        console.error(`[MessageSync] Error processing conversation ${conv.id}:`, convErr.message);
        stats.errors.push({ conversationId: conv.id, error: convErr.message });
      }
    }

    // Update lastSyncedAt
    await prisma.linkedInAccount.update({
      where: { id: linkedInAccountId },
      data:  { lastSyncedAt: new Date() },
    });

    emitInboxUpdate(userId, {
      linkedInAccountId,
      conversationsCount: stats.conversationsProcessed,
      newMessagesCount:   stats.newMessages,
      syncedAt:           new Date().toISOString(),
    });

    stats.completedAt = new Date();
    stats.durationMs  = stats.completedAt - stats.startedAt;

    console.log(`[MessageSync] Completed for ${linkedInAccountId}:`, {
      conversations: stats.conversationsProcessed,
      newMessages:   stats.newMessages,
      duration:      `${stats.durationMs}ms`,
      errors:        stats.errors.length,
    });

    // Activity log in Redis
    const redis = getRedis();
    await redis.lpush(
      `activity:log:${linkedInAccountId}`,
      JSON.stringify({ type: 'sync', linkedInAccountId, timestamp: Date.now(),
        stats: { conversations: stats.conversationsProcessed, newMessages: stats.newMessages } })
    );
    await redis.ltrim(`activity:log:${linkedInAccountId}`, 0, 999);

    return stats;
  } catch (err) {
    console.error(`[MessageSync] Fatal error for ${linkedInAccountId}:`, err);
    stats.errors.push({ fatal: true, error: err.message });
    stats.completedAt = new Date();
    return stats;
  }
}

/**
 * Sync all active LinkedIn accounts (reads from DB, not env).
 * Staggered to respect rate limits.
 *
 * @param {string|null} proxyUrl
 */
async function syncAllAccounts(proxyUrl = null) {
  console.log('[MessageSync] Starting sync for all active accounts...');

  const prisma   = getPrisma();
  const accounts = await prisma.linkedInAccount.findMany({
    where:  { status: 'active' },
    select: { id: true, userId: true },
  });

  if (accounts.length === 0) {
    console.warn('[MessageSync] No active LinkedInAccounts in DB — nothing to sync.');
    return { totalAccounts: 0, results: [] };
  }

  const results = [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      const accountStats = await syncAccount(account.id, account.userId, proxyUrl);
      results.push(accountStats);
    } catch (err) {
      console.error(`[MessageSync] Failed to sync ${account.id}:`, err);
      results.push({ linkedInAccountId: account.id, error: err.message, errors: [{ fatal: true, error: err.message }] });
    }

    // Stagger between accounts (2–3 minutes)
    if (i < accounts.length - 1) {
      const stagger = 120_000 + Math.random() * 60_000;
      console.log(`[MessageSync] Waiting ${Math.round(stagger / 1000)}s before next account...`);
      await delay(stagger);
    }
  }

  const summary = {
    totalAccounts:      accounts.length,
    successfulAccounts: results.filter((r) => !r.errors?.length).length,
    totalConversations: results.reduce((s, r) => s + (r.conversationsProcessed || 0), 0),
    totalNewMessages:   results.reduce((s, r) => s + (r.newMessages || 0), 0),
    totalErrors:        results.reduce((s, r) => s + (r.errors?.length || 0), 0),
    results,
    syncedAt:           new Date().toISOString(),
  };

  console.log('[MessageSync] All accounts sync complete:', summary);
  return summary;
}

function delay(minMs, maxMs) {
  const ms = maxMs ? minMs + Math.random() * (maxMs - minMs) : minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { syncAccount, syncAllAccounts };
