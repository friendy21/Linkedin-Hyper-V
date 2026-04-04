// FILE: app/(dashboard)/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationFeed } from '@/components/notifications/NotificationFeed';
import { useWebSocket } from '@/components/providers/WebSocketProvider';
import { motion } from 'framer-motion';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  receivedAt: string;
  readAt?: string | null;
  linkedInAccountId: string;
  accountDisplayName?: string;
  linkedinUrl?: string | null;
}

interface NewNotificationData {
  linkedInAccountId: string;
  notification: {
    type: string;
    title: string;
    body?: string | null;
    receivedAt: string;
    linkedinUrl?: string | null;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useWebSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data: unknown = await res.json();
      const list = Array.isArray(data)
        ? data as Notification[]
        : (typeof data === 'object' && data !== null && 'notifications' in data)
        ? (data as { notifications: Notification[] }).notifications
        : [];
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time socket subscription
  useEffect(() => {
    if (!socket) return;

    const handler = (data: NewNotificationData) => {
      const newNotif: Notification = {
        id: `rt-${Date.now()}`,
        linkedInAccountId: data.linkedInAccountId,
        type: data.notification.type,
        title: data.notification.title,
        body: data.notification.body,
        receivedAt: data.notification.receivedAt || new Date().toISOString(),
        linkedinUrl: data.notification.linkedinUrl,
        readAt: null,
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    socket.on('notification:new', handler);
    return () => { socket.off('notification:new', handler); };
  }, [socket]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch (_) {
      // client-only fallback handled in component
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 max-w-4xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="page-title">Activity</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {loading ? '…' : `${notifications.filter(n => !n.readAt).length} unread notifications`}
        </p>
      </div>

      <NotificationFeed
        notifications={notifications}
        loading={loading}
        onMarkAllRead={handleMarkAllRead}
      />
    </motion.div>
  );
}
