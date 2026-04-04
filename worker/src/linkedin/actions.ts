/**
 * LinkedIn automation actions
 * Send messages, connection requests, and other interactions
 */

import type { Page } from 'rebrowser-playwright';
import type { Job } from 'bullmq';
import type { JobData, LinkedInAccount, Message, Conversation } from '../types/index.js';
import { SELECTORS, safeClick, getTextContent, waitForAnySelector } from './selectors.js';
import { humanType, humanClick, humanScroll } from '../stealth/human-mouse.js';
import { actionDelay, microDelay } from '../stealth/timing.js';
import { getBrowserPool } from '../browser/pool.js';
import { getSessionManager } from './session.js';
import { checkRateLimit, incrementRateLimit } from '../utils/rate-limiter.js';
import prisma from '../db/prisma.js';
import logger from '../utils/logger.js';

export interface SendMessagePayload {
  conversationId?: string;
  recipientProfileUrl?: string;
  message: string;
  useAI?: boolean;
}

export interface SendConnectionPayload {
  profileUrl: string;
  message?: string;
}

/**
 * Sends a message to an existing conversation or starts a new one
 * 
 * @param job - BullMQ job
 * @returns Result of the operation
 */
export async function sendMessageAction(job: Job<JobData>): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { accountId, payload } = job.data;
  const { conversationId, recipientProfileUrl, message } = payload as SendMessagePayload;

  logger.info(`Sending message for account ${accountId}`);

  // Get account from database
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(account, 'message');
  if (!rateLimit.canProceed) {
    throw new Error(rateLimit.reason || 'Rate limit exceeded');
  }

  // Get browser
  const pool = getBrowserPool();
  const page = await pool.getPage(account);

  // Ensure valid session
  const sessionManager = getSessionManager();
  const sessionStatus = await sessionManager.ensureSession(account, page.context());
  
  if (sessionStatus.state !== 'active') {
    throw new Error(`Session not active: ${sessionStatus.state}`);
  }

  try {
    let conversationUrl: string;

    if (conversationId) {
      // Navigate to existing conversation
      conversationUrl = `https://www.linkedin.com/messaging/thread/${conversationId}/`;
    } else if (recipientProfileUrl) {
      // Navigate to profile and start new conversation
      await page.goto(recipientProfileUrl, { waitUntil: 'domcontentloaded' });
      await actionDelay('navigation');

      // Click message button on profile
      const messageButton = await page.$(SELECTORS.profile.messageButton);
      if (!messageButton) {
        throw new Error('Cannot message this profile');
      }

      await humanClick(page, SELECTORS.profile.messageButton);
      await microDelay(500);

      conversationUrl = page.url();
    } else {
      throw new Error('Must provide conversationId or recipientProfileUrl');
    }

    // Navigate to conversation
    await page.goto(conversationUrl, { waitUntil: 'domcontentloaded' });
    await actionDelay('navigation');

    // Wait for message input
    await page.waitForSelector(SELECTORS.messaging.messageInput, { timeout: 10000 });

    // Type message
    await humanType(page, SELECTORS.messaging.messageInput, message, { typoRate: 0.02 });
    await microDelay(300);

    // Send message
    await humanClick(page, SELECTORS.messaging.sendButton);

    // Wait for message to be sent
    await page.waitForSelector(SELECTORS.messaging.sendButtonDisabled, { timeout: 5000 }).catch(() => {});

    // Increment rate limit
    await incrementRateLimit(accountId, 'message');

    // Update database
    const conversation = await prisma.conversation.upsert({
      where: { id: conversationId || conversationUrl.split('/').pop() || 'unknown' },
      update: {
        lastMessageText: message,
        lastMessageAt: new Date(),
        lastMessageSentByMe: true,
      },
      create: {
        id: conversationId || conversationUrl.split('/').pop() || 'unknown',
        linkedInAccountId: accountId,
        participantName: 'Unknown', // Would be extracted from page
        participantProfileUrl: recipientProfileUrl || '',
        lastMessageText: message,
        lastMessageAt: new Date(),
        lastMessageSentByMe: true,
      },
    });

    // Store message
    const storedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        linkedInAccountId: accountId,
        senderId: '__self__',
        senderName: account.displayName,
        text: message,
        sentAt: new Date(),
        isSentByMe: true,
      },
    });

    logger.info(`Message sent successfully for account ${accountId}`);

    return {
      success: true,
      messageId: storedMessage.id,
    };
  } catch (error) {
    logger.error(`Failed to send message for ${accountId}:`, error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Sends a connection request
 * 
 * @param job - BullMQ job
 * @returns Result of the operation
 */
export async function sendConnectionAction(job: Job<JobData>): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const { accountId, payload } = job.data;
  const { profileUrl, message } = payload as SendConnectionPayload;

  logger.info(`Sending connection request for account ${accountId} to ${profileUrl}`);

  // Get account
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(account, 'connection');
  if (!rateLimit.canProceed) {
    throw new Error(rateLimit.reason || 'Rate limit exceeded');
  }

  // Get browser
  const pool = getBrowserPool();
  const page = await pool.getPage(account);

  // Ensure session
  const sessionManager = getSessionManager();
  const sessionStatus = await sessionManager.ensureSession(account, page.context());
  
  if (sessionStatus.state !== 'active') {
    throw new Error(`Session not active: ${sessionStatus.state}`);
  }

  try {
    // Navigate to profile
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await actionDelay('profile_view');

    // Check if already connected
    const isConnected = await page.$(SELECTORS.profile.messageButton);
    if (isConnected) {
      logger.info(`Already connected to ${profileUrl}`);
      return { success: true };
    }

    // Click connect button
    const connectClicked = await safeClick(page, [SELECTORS.profile.connectButton, 'button:has-text("Connect")'], { timeout: 5000 });
    if (!connectClicked) {
      throw new Error('Could not find connect button');
    }

    await microDelay(500);

    // Check for "Add a note" option
    if (message) {
      const addNoteButton = await page.$(SELECTORS.connections.addNoteButton);
      if (addNoteButton) {
        await humanClick(page, SELECTORS.connections.addNoteButton);
        await microDelay(300);

        // Type custom message
        await humanType(page, SELECTORS.connections.noteInput, message, { typoRate: 0.02 });
        await microDelay(300);
      }
    }

    // Send invitation
    await humanClick(page, SELECTORS.connections.sendInvitationButton);

    // Wait for confirmation
    await page.waitForTimeout(1000);

    // Check for error messages
    const errorElement = await page.$('.artdeco-inline-feedback__message');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      throw new Error(errorText || 'Connection request failed');
    }

    // Increment rate limit
    await incrementRateLimit(accountId, 'connection');

    // Store in database
    const request = await prisma.connectionRequest.create({
      data: {
        linkedInAccountId: accountId,
        targetProfileUrl: profileUrl,
        message: message || null,
        status: 'pending',
        sentAt: new Date(),
      },
    });

    logger.info(`Connection request sent for account ${accountId}`);

    return {
      success: true,
      requestId: request.id,
    };
  } catch (error) {
    logger.error(`Failed to send connection for ${accountId}:`, error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Scrapes inbox conversations
 * 
 * @param job - BullMQ job
 * @returns Scraped conversations
 */
export async function scrapeInboxAction(job: Job<JobData>): Promise<{ success: boolean; conversationsCount: number; error?: string }> {
  const { accountId } = job.data;

  logger.info(`Scraping inbox for account ${accountId}`);

  // Get account
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Get browser
  const pool = getBrowserPool();
  const page = await pool.getPage(account);

  // Ensure session
  const sessionManager = getSessionManager();
  const sessionStatus = await sessionManager.ensureSession(account, page.context());
  
  if (sessionStatus.state !== 'active') {
    throw new Error(`Session not active: ${sessionStatus.state}`);
  }

  try {
    // Navigate to messaging
    await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' });
    await actionDelay('navigation');

    // Wait for conversation list
    await page.waitForSelector(SELECTORS.messaging.conversationList, { timeout: 15000 });

    // Get all conversation items
    const conversationElements = await page.$$(SELECTORS.messaging.conversationItem);
    let processedCount = 0;

    for (const element of conversationElements.slice(0, 20)) { // Limit to 20 conversations per scrape
      try {
        // Extract conversation data
        const linkElement = await element.$('a');
        if (!linkElement) continue;

        const href = await linkElement.getAttribute('href');
        if (!href) continue;

        const conversationId = href.split('/').pop()?.split('?')[0];
        if (!conversationId) continue;

        const nameElement = await element.$('.msg-conversation-listitem__participant-names');
        const name = await nameElement?.textContent() || 'Unknown';

        const snippetElement = await element.$('.msg-conversation-listitem__message-snippet');
        const snippet = await snippetElement?.textContent() || '';

        const timeElement = await element.$('time');
        const timeText = await timeElement?.getAttribute('datetime');
        const lastMessageAt = timeText ? new Date(timeText) : new Date();

        const isUnread = await element.$('.msg-conversation-card__unread-count') !== null;

        // Upsert conversation
        await prisma.conversation.upsert({
          where: { id: conversationId },
          update: {
            lastMessageText: snippet,
            lastMessageAt,
            unreadCount: isUnread ? 1 : 0,
          },
          create: {
            id: conversationId,
            linkedInAccountId: accountId,
            participantName: name.trim(),
            lastMessageText: snippet,
            lastMessageAt,
            unreadCount: isUnread ? 1 : 0,
            lastMessageSentByMe: false,
          },
        });

        processedCount++;
      } catch (error) {
        logger.warn('Failed to process conversation element:', error);
      }
    }

    // Update last active
    await prisma.linkedInAccount.update({
      where: { id: accountId },
      data: { lastActiveAt: new Date() },
    });

    logger.info(`Scraped ${processedCount} conversations for account ${accountId}`);

    return {
      success: true,
      conversationsCount: processedCount,
    };
  } catch (error) {
    logger.error(`Failed to scrape inbox for ${accountId}:`, error);
    return {
      success: false,
      conversationsCount: 0,
      error: String(error),
    };
  }
}

/**
 * Scrapes a conversation thread for messages
 * 
 * @param job - BullMQ job
 * @returns Scraped messages
 */
export async function scrapeThreadAction(job: Job<JobData>): Promise<{ success: boolean; messagesCount: number; error?: string }> {
  const { accountId, payload } = job.data;
  const { conversationId } = payload as { conversationId: string };

  logger.info(`Scraping thread ${conversationId} for account ${accountId}`);

  // Get account
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Get browser
  const pool = getBrowserPool();
  const page = await pool.getPage(account);

  // Ensure session
  const sessionManager = getSessionManager();
  const sessionStatus = await sessionManager.ensureSession(account, page.context());
  
  if (sessionStatus.state !== 'active') {
    throw new Error(`Session not active: ${sessionStatus.state}`);
  }

  try {
    // Navigate to conversation
    await page.goto(`https://www.linkedin.com/messaging/thread/${conversationId}/`, {
      waitUntil: 'domcontentloaded',
    });
    await actionDelay('navigation');

    // Wait for message thread
    await page.waitForSelector(SELECTORS.messaging.messageThread, { timeout: 15000 });

    // Scroll to load more messages
    await humanScroll(page, -500);
    await page.waitForTimeout(1000);

    // Get all messages
    const messageElements = await page.$$(SELECTORS.messaging.messageItem);
    let processedCount = 0;

    for (const element of messageElements) {
      try {
        // Extract message data
        const textElement = await element.$(SELECTORS.messaging.messageText);
        const text = await textElement?.textContent();
        if (!text) continue;

        const senderElement = await element.$('.msg-s-message-group__name');
        const senderName = await senderElement?.textContent() || 'Unknown';

        const timeElement = await element.$('time');
        const timeText = await timeElement?.getAttribute('datetime');
        const sentAt = timeText ? new Date(timeText) : new Date();

        // Check if from me
        const isFromMe = await element.evaluate((el) => {
          return el.classList.contains('msg-s-event-listitem--group-a') ||
                 el.closest('.msg-s-message-group--me') !== null;
        });

        // Create message (ignore duplicates)
        await prisma.message.upsert({
          where: {
            // Unique constraint on conversation + sentAt + text
            id: `${conversationId}_${sentAt.getTime()}_${text.slice(0, 50)}`,
          },
          update: {},
          create: {
            id: `${conversationId}_${sentAt.getTime()}_${text.slice(0, 50)}`,
            conversationId,
            linkedInAccountId: accountId,
            senderId: isFromMe ? '__self__' : senderName,
            senderName: senderName.trim(),
            text: text.trim(),
            sentAt,
            isSentByMe: isFromMe,
          },
        });

        processedCount++;
      } catch (error) {
        logger.warn('Failed to process message element:', error);
      }
    }

    // Mark conversation as read in UI
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
    }

    logger.info(`Scraped ${processedCount} messages from thread ${conversationId}`);

    return {
      success: true,
      messagesCount: processedCount,
    };
  } catch (error) {
    logger.error(`Failed to scrape thread for ${accountId}:`, error);
    return {
      success: false,
      messagesCount: 0,
      error: String(error),
    };
  }
}
