/**
 * Express API server
 * REST API and WebSocket endpoints for the worker
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { getQueueManager } from './queue/manager.js';
import { getBrowserPool } from './browser/pool.js';
import prisma from './db/prisma.js';
import logger from './utils/logger.js';
import { sendMessageAction, sendConnectionAction, scrapeInboxAction, scrapeThreadAction } from './linkedin/actions.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Configure appropriately in production
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API authentication middleware
const authenticateApi = (req: Request, res: Response, next: NextFunction) => {
  const authToken = req.headers['x-api-secret'];
  if (authToken !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply auth to all routes except health
app.use('/api', authenticateApi);

// Health check endpoint (public)
app.get('/health', async (_req: Request, res: Response) => {
  const pool = getBrowserPool();
  const queueManager = getQueueManager();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    browsers: pool.getStats(),
    queues: queueManager.getActiveQueues().length,
    workers: queueManager.getActiveWorkers().length,
  });
});

// ==================== ACCOUNT ENDPOINTS ====================

// Get all accounts
app.get('/api/accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        status: true,
        trustScore: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    res.json({ accounts });
  } catch (error) {
    logger.error('Failed to fetch accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get account details
app.get('/api/accounts/:id', async (req: Request, res: Response) => {
  try {
    const account = await prisma.linkedInAccount.findUnique({
      where: { id: req.params.id },
      include: {
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            conversations: true,
            messages: true,
            connections: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ account });
  } catch (error) {
    logger.error('Failed to fetch account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Create new account
app.post('/api/accounts', async (req: Request, res: Response) => {
  try {
    const { id, displayName, email, linkedinUrl } = req.body;

    const account = await prisma.linkedInAccount.create({
      data: {
        id,
        userId: req.body.userId || 'default',
        displayName,
        email,
        linkedinUrl,
        canvasSeed: Math.floor(Math.random() * 2147483647) + 1,
      },
    });

    // Start worker for this account
    const queueManager = getQueueManager();
    await queueManager.startWorker(id);

    res.status(201).json({ account });
  } catch (error) {
    logger.error('Failed to create account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ==================== MESSAGE ENDPOINTS ====================

// Get messages for an account
app.get('/api/accounts/:id/messages', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const messages = await prisma.message.findMany({
      where: { linkedInAccountId: req.params.id },
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        conversation: true,
      },
    });

    res.json({ messages });
  } catch (error) {
    logger.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
app.post('/api/accounts/:id/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId, recipientProfileUrl, message, useAI } = req.body;

    const queueManager = getQueueManager();
    const job = await queueManager.addJob(
      req.params.id,
      'send_message',
      {
        conversationId,
        recipientProfileUrl,
        message,
        useAI,
      },
      { priority: 10 }
    );

    res.json({ jobId: job.id, status: 'queued' });
  } catch (error) {
    logger.error('Failed to queue message:', error);
    res.status(500).json({ error: 'Failed to queue message' });
  }
});

// ==================== CONVERSATION ENDPOINTS ====================

// Get conversations for an account
app.get('/api/accounts/:id/conversations', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0', unreadOnly = 'false' } = req.query;

    const conversations = await prisma.conversation.findMany({
      where: {
        linkedInAccountId: req.params.id,
        ...(unreadOnly === 'true' ? { unreadCount: { gt: 0 } } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json({ conversations });
  } catch (error) {
    logger.error('Failed to fetch conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation messages
app.get('/api/accounts/:id/conversations/:conversationId', async (req: Request, res: Response) => {
  try {
    const { limit = '100', offset = '0' } = req.query;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.conversationId,
        linkedInAccountId: req.params.id,
      },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    logger.error('Failed to fetch conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ==================== CONNECTION ENDPOINTS ====================

// Get connection requests
app.get('/api/accounts/:id/connections', async (req: Request, res: Response) => {
  try {
    const { status = 'pending' } = req.query;

    const connections = await prisma.connectionRequest.findMany({
      where: {
        linkedInAccountId: req.params.id,
        status: status as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ connections });
  } catch (error) {
    logger.error('Failed to fetch connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Send connection request
app.post('/api/accounts/:id/connections', async (req: Request, res: Response) => {
  try {
    const { profileUrl, message } = req.body;

    const queueManager = getQueueManager();
    const job = await queueManager.addJob(
      req.params.id,
      'send_connection',
      {
        profileUrl,
        message,
      },
      { priority: 5 }
    );

    res.json({ jobId: job.id, status: 'queued' });
  } catch (error) {
    logger.error('Failed to queue connection:', error);
    res.status(500).json({ error: 'Failed to queue connection' });
  }
});

// ==================== SCRAPING ENDPOINTS ====================

// Trigger inbox scrape
app.post('/api/accounts/:id/scrape-inbox', async (req: Request, res: Response) => {
  try {
    const queueManager = getQueueManager();
    const job = await queueManager.addJob(
      req.params.id,
      'scrape_inbox',
      {},
      { priority: 1 }
    );

    res.json({ jobId: job.id, status: 'queued' });
  } catch (error) {
    logger.error('Failed to queue inbox scrape:', error);
    res.status(500).json({ error: 'Failed to queue inbox scrape' });
  }
});

// Trigger thread scrape
app.post('/api/accounts/:id/scrape-thread/:conversationId', async (req: Request, res: Response) => {
  try {
    const queueManager = getQueueManager();
    const job = await queueManager.addJob(
      req.params.id,
      'scrape_thread',
      {
        conversationId: req.params.conversationId,
      },
      { priority: 5 }
    );

    res.json({ jobId: job.id, status: 'queued' });
  } catch (error) {
    logger.error('Failed to queue thread scrape:', error);
    res.status(500).json({ error: 'Failed to queue thread scrape' });
  }
});

// ==================== QUEUE ENDPOINTS ====================

// Get queue stats
app.get('/api/accounts/:id/queue-stats', async (req: Request, res: Response) => {
  try {
    const queueManager = getQueueManager();
    const stats = await queueManager.getQueueStats(req.params.id);
    res.json({ stats });
  } catch (error) {
    logger.error('Failed to fetch queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

// Pause account queue
app.post('/api/accounts/:id/pause', async (req: Request, res: Response) => {
  try {
    const queueManager = getQueueManager();
    await queueManager.pauseQueue(req.params.id);
    
    await prisma.linkedInAccount.update({
      where: { id: req.params.id },
      data: { status: 'quarantined' },
    });

    res.json({ status: 'paused' });
  } catch (error) {
    logger.error('Failed to pause queue:', error);
    res.status(500).json({ error: 'Failed to pause queue' });
  }
});

// Resume account queue
app.post('/api/accounts/:id/resume', async (req: Request, res: Response) => {
  try {
    const queueManager = getQueueManager();
    await queueManager.resumeQueue(req.params.id);
    
    await prisma.linkedInAccount.update({
      where: { id: req.params.id },
      data: { status: 'active' },
    });

    res.json({ status: 'resumed' });
  } catch (error) {
    logger.error('Failed to resume queue:', error);
    res.status(500).json({ error: 'Failed to resume queue' });
  }
});

// ==================== WEBSOCKET HANDLING ====================

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  socket.on('subscribe:account', (accountId: string) => {
    socket.join(`account:${accountId}`);
    logger.debug(`Client ${socket.id} subscribed to account ${accountId}`);
  });

  socket.on('unsubscribe:account', (accountId: string) => {
    socket.leave(`account:${accountId}`);
    logger.debug(`Client ${socket.id} unsubscribed from account ${accountId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;

export async function startServer(): Promise<void> {
  // Initialize queue manager and register handlers
  const queueManager = getQueueManager();
  queueManager.registerHandler('send_message', sendMessageAction);
  queueManager.registerHandler('send_connection', sendConnectionAction);
  queueManager.registerHandler('scrape_inbox', scrapeInboxAction);
  queueManager.registerHandler('scrape_thread', scrapeThreadAction);

  // Start workers for existing accounts
  const accounts = await prisma.linkedInAccount.findMany({
    where: { status: 'active' },
  });

  for (const account of accounts) {
    await queueManager.startWorker(account.id);
    logger.info(`Started worker for account ${account.id}`);
  }

  server.listen(PORT, () => {
    logger.info(`Worker API server running on port ${PORT}`);
  });
}

export { app, io, server };
