// FILE: worker/src/utils/websocket.js
// User-scoped Socket.IO event emission.
// All events go to rooms named "user:{userId}".
// NEVER broadcast globally — this is a multi-tenant system.

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize WebSocket server.
 * @param {object} httpServer - HTTP server instance
 */
function initializeWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:  process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    // Client joins a user-specific room. userId comes from the authenticated frontend session.
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[WebSocket] Client ${socket.id} joined room: user:${userId}`);
      }
    });

    socket.on('leave:user', (userId) => {
      if (userId) {
        socket.leave(`user:${userId}`);
        console.log(`[WebSocket] Client ${socket.id} left room: user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });

    socket.emit('connected', {
      message:   'Connected to LinkedIn Automation WebSocket',
      timestamp: new Date().toISOString(),
    });
  });

  console.log('[WebSocket] Server initialized');
  return io;
}

function getIO() {
  if (!io) console.warn('[WebSocket] Socket.IO not initialized');
  return io;
}

/**
 * Emit event to a specific user's room.
 * This is the ONLY way to emit in this system — no global broadcasts.
 *
 * @param {string} userId - App user's ID
 * @param {string} event  - Event name
 * @param {object} data   - Event payload
 */
function emitToUser(userId, event, data) {
  const socketIO = getIO();
  if (socketIO && userId) {
    socketIO.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`[WebSocket] → user:${userId} ${event}`);
  }
}

// ── Typed emitters ────────────────────────────────────────────────────────────

function emitInboxUpdate(userId, data) {
  emitToUser(userId, 'inbox:updated', data);
}

function emitNewMessage(userId, data) {
  emitToUser(userId, 'inbox:new_message', data);
}

function emitNewConnection(userId, data) {
  emitToUser(userId, 'connection:new', data);
}

function emitNewNotification(userId, data) {
  emitToUser(userId, 'notification:new', data);
}

function emitSessionExpired(userId, linkedInAccountId) {
  emitToUser(userId, 'session:expired', { linkedInAccountId });
}

function emitAccountStatus(userId, data) {
  emitToUser(userId, 'account:status', data);
}

function emitRateLimitUpdate(userId, data) {
  emitToUser(userId, 'rate_limit:updated', data);
}

module.exports = {
  initializeWebSocket,
  getIO,
  emitToUser,
  emitInboxUpdate,
  emitNewMessage,
  emitNewConnection,
  emitNewNotification,
  emitSessionExpired,
  emitAccountStatus,
  emitRateLimitUpdate,
};
