'use strict';

// FILE: worker/src/services/realtimeHook.js
// Maintains a persistent Playwright page per active LinkedIn account.
// Intercepts XHR and WebSocket traffic to provide real-time messaging sync.

const { getAccountContext, cleanupContext } = require('../browser');
const { getPrisma }                         = require('../db/prisma');
const { emitNewMessage, emitInboxUpdate }   = require('../utils/websocket');
const { getRedis }                          = require('../redisClient');

const activeListeners = new Map(); // linkedInAccountId -> { page, context }

/**
 * Start a persistent real-time listener for an account.
 * 
 * @param {string} linkedInAccountId 
 * @param {string} userId 
 * @param {string|null} proxyUrl 
 */
async function startRealtimeListener(linkedInAccountId, userId, proxyUrl = null) {
  if (activeListeners.has(linkedInAccountId)) {
    console.log(`[RealtimeHook] Listener already active for ${linkedInAccountId}`);
    return;
  }

  console.log(`[RealtimeHook] Starting listener for ${linkedInAccountId}`);

  try {
    const { context } = await getAccountContext(linkedInAccountId, userId, proxyUrl);
    const page = await context.newPage();

    // 1. Intercept XHR responses for messaging API
    await page.route('**/voyager/api/messaging/conversations*', async (route) => {
      const response = await route.fetch();
      try {
        const json = await response.json();
        // Parse the intercepted payload to extract new messages and update DB instantly
        processInterceptedPayload(linkedInAccountId, userId, json).catch(err => 
          console.error(`[RealtimeHook] Paylaod processing error:`, err.message)
        );
      } catch (err) {
        // usually perfectly normal if payload isn't JSON
      }
      await route.fulfill({ response });
    });

    // 2. Intercept WebSocket push channel
    page.on('websocket', ws => {
      ws.on('framereceived', frame => {
        try {
          const payload = Buffer.isBuffer(frame.payload) ? frame.payload.toString() : frame.payload;
          
          // LinkedIn's real-time events often contain 'messaging' or 'realtime' markers
          if (payload.includes('voyager/api/messaging') || payload.includes('com.linkedin.voyager.messaging.Event')) {
            console.log(`[RealtimeHook] Detected WS messaging event for ${linkedInAccountId}, triggering fast sync...`);
            
            // Queue a fast sync job when a push event arrives
            const { getQueue } = require('../queue');
            getQueue(linkedInAccountId).add('messageSync', { linkedInAccountId, proxyUrl }, { 
              jobId: `fastSync:${linkedInAccountId}:${Date.now()}` 
            }).catch(() => {});
          }
        } catch (e) {
          // ignore parsing errors
        }
      });
    });

    // Handle page crashes
    page.on('close', () => {
      console.log(`[RealtimeHook] Page closed for ${linkedInAccountId}`);
      activeListeners.delete(linkedInAccountId);
    });
    
    page.on('crash', () => {
      console.error(`[RealtimeHook] Page crashed for ${linkedInAccountId}`);
      activeListeners.delete(linkedInAccountId);
      // Attempt restart after delay
      setTimeout(() => startRealtimeListener(linkedInAccountId, userId, proxyUrl), 10000);
    });

    // Keep the page alive on the messaging tab
    await page.goto('https://www.linkedin.com/messaging/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    activeListeners.set(linkedInAccountId, { page, context });
    console.log(`[RealtimeHook] Listener fully active for ${linkedInAccountId}`);
    
  } catch (err) {
    console.error(`[RealtimeHook] Failed to start listener for ${linkedInAccountId}:`, err.message);
    activeListeners.delete(linkedInAccountId);
  }
}

/**
 * Stop the real-time listener for an account.
 * 
 * @param {string} linkedInAccountId 
 */
async function stopRealtimeListener(linkedInAccountId) {
  const listener = activeListeners.get(linkedInAccountId);
  if (listener) {
    console.log(`[RealtimeHook] Stopping listener for ${linkedInAccountId}`);
    try {
      await listener.page.close();
    } catch (e) {}
    activeListeners.delete(linkedInAccountId);
  }
}

/**
 * Process a JSON payload intercepted from the messaging API XHR routes.
 */
async function processInterceptedPayload(linkedInAccountId, userId, payload) {
  if (!payload || !payload.elements) return;
  
  const prisma = getPrisma();
  let updatedConvCount = 0;
  let newMsgCount = 0;

  for (const element of payload.elements) {
    if (!element.entityUrn) continue;
    
    // Process Conversations
    if (element.entityUrn.includes('urn:li:fs_conversation:')) {
      const conversationId = element.entityUrn.split(':').pop();
      const lastMessage = element.events?.[0]; // Usually the most recent event is at index 0
      
      let participantName = 'Unknown';
      let participantProfileUrl = null;
      let participantAvatarUrl = null;

      // Try to extract participant info if available
      try {
        if (element.participants && element.participants.length > 0) {
          const p = element.participants.find(p => p['*messagingMember'] && !p['*messagingMember'].includes(userId)) || element.participants[0];
          if (p.com_linkedin_voyager_messaging_MessagingMember?.miniProfile) {
             const mp = p.com_linkedin_voyager_messaging_MessagingMember.miniProfile;
             participantName = `${mp.firstName} ${mp.lastName}`.trim();
          }
        }
      } catch (e) {}

      // Upsert Conversation
      await prisma.conversation.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          linkedInAccountId,
          participantName,
          participantProfileUrl,
          participantAvatarUrl,
          lastMessageAt: new Date(lastMessage?.createdAt || Date.now()),
          lastMessageText: lastMessage?.eventContent?.com_linkedin_voyager_messaging_event_MessageEvent?.customContent?.com_linkedin_voyager_messaging_customcontent_TextContent?.text || '',
          lastMessageSentByMe: lastMessage?.from?.includes(userId) || false,
        },
        update: {
          lastMessageAt: new Date(lastMessage?.createdAt || Date.now()),
          lastMessageText: lastMessage?.eventContent?.com_linkedin_voyager_messaging_event_MessageEvent?.customContent?.com_linkedin_voyager_messaging_customcontent_TextContent?.text || '',
          lastMessageSentByMe: lastMessage?.from?.includes(userId) || false,
        }
      });
      updatedConvCount++;
    }
    
    // Process Messages (Events)
    if (element.entityUrn.includes('urn:li:fs_event:')) {
      const conversationId = element.entityUrn.split(':').slice(-2, -1)[0]; // urn:li:fs_event:(convId,eventId)
      const eventId = element.entityUrn.split(',').pop().replace(')', '');
      
      const sentAt = new Date(element.createdAt || Date.now());
      const text = element.eventContent?.com_linkedin_voyager_messaging_event_MessageEvent?.customContent?.com_linkedin_voyager_messaging_customcontent_TextContent?.text || '';
      const isSentByMe = element.from?.includes(userId) || false;
      
      if (!text) continue;

      try {
        const msg = await prisma.message.upsert({
          where: {
            conversationId_sentAt_text: {
              conversationId,
              sentAt,
              text,
            }
          },
          create: {
            conversationId,
            linkedInAccountId,
            senderId: element.from || '__unknown__',
            senderName: isSentByMe ? 'Me' : 'Participant', // simplified
            text,
            sentAt,
            isSentByMe,
            linkedinMessageId: eventId,
          },
          update: {} // No-op if it exists
        });
        
        // If it's a new inset, upsert will return it and we can emit
        if (msg) {
          newMsgCount++;
          emitNewMessage(userId, {
            linkedInAccountId,
            conversationId,
            participantName: 'Participant',
            newMessagesCount: 1,
            text
          });
        }
      } catch (upsertErr) {
        // Ignore unique constraint errors
      }
    }
  }

  if (updatedConvCount > 0) {
    emitInboxUpdate(userId, {
      linkedInAccountId,
      conversationsCount: updatedConvCount,
      newMessagesCount: newMsgCount,
      syncedAt: new Date().toISOString(),
    });
    
    // Log activity
    const redis = getRedis();
    const logVal = JSON.stringify({
      type: 'realtime_sync', 
      linkedInAccountId, 
      timestamp: Date.now(),
      stats: { updatedConversations: updatedConvCount, newMessages: newMsgCount }
    });
    await redis.lpush(`activity:log:${linkedInAccountId}`, logVal);
    await redis.ltrim(`activity:log:${linkedInAccountId}`, 0, 999);
  }
}

module.exports = { startRealtimeListener, stopRealtimeListener };
