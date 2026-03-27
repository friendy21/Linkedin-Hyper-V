// FILE: components/providers/WebSocketProvider.tsx
// Connects to the worker WebSocket, joins the user's room for scoped events.
'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ socket: null, isConnected: false });

export function useWebSocket() {
  return useContext(WebSocketContext);
}

/**
 * Connects to the worker Socket.IO server and joins the authenticated user's room.
 * Pass userId from your auth context / session to scope real-time events correctly.
 */
export function WebSocketProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string | null;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);

      // Join the user-specific room for scoped events
      if (userId) {
        socket.emit('join:user', userId);
        console.log(`[WebSocket] Joined room: user:${userId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
    });

    // Re-join room after reconnect
    socket.on('reconnect', () => {
      if (userId) {
        socket.emit('join:user', userId);
      }
    });

    // Global toast for new messages (individual pages handle their own updates)
    socket.on('inbox:new_message', (data) => {
      const senderName = data.participantName || data.senderName || 'Someone';
      toast.success(`New message from ${senderName}`, { icon: '💬', duration: 4000 });
    });

    socket.on('session:expired', (data) => {
      toast.error('A LinkedIn session expired — reconnect in Accounts.', {
        icon: '⚠️',
        duration: 8000,
      });
      console.warn('[WebSocket] Session expired for account:', data.linkedInAccountId);
    });

    socket.on('connection:new', (data) => {
      toast.success(`New connection: ${data.connection?.name || 'Someone'}`, { icon: '🤝', duration: 4000 });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
