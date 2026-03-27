// FILE: app/(dashboard)/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, CheckCheck, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '@/components/providers/WebSocketProvider';

interface Notification {
  id: string;
  linkedInAccountId: string;
  type: string;
  title: string;
  body?: string | null;
  linkedinUrl?: string | null;
  readAt?: string | null;
  receivedAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  connection: '🤝',
  message:    '💬',
  reaction:   '👍',
  comment:    '💭',
  mention:    '📢',
  follow:     '👤',
  job:        '💼',
  other:      '🔔',
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [expiredBanner, setExpiredBanner] = useState<string | null>(null); // linkedInAccountId that expired
  const { socket } = useWebSocket();

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=100');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time socket events
  useEffect(() => {
    if (!socket) return;

    const onNewNotification = (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev]);
    };

    const onSessionExpired = (data: { linkedInAccountId: string }) => {
      setExpiredBanner(data.linkedInAccountId);
    };

    socket.on('notification:new', onNewNotification);
    socket.on('session:expired',  onSessionExpired);

    return () => {
      socket.off('notification:new', onNewNotification);
      socket.off('session:expired',  onSessionExpired);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Session expired banner */}
      {expiredBanner && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl mb-6"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            <div>
              <p className="font-medium text-sm" style={{ color: '#ef4444' }}>LinkedIn session expired</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Your LinkedIn session has expired. Reconnect to resume syncing.
              </p>
            </div>
          </div>
          <a
            href="/accounts"
            className="px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            style={{ background: '#ef4444', color: 'white' }}
          >
            Reconnect
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            All LinkedIn notifications across your connected accounts
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-80"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
        >
          <Bell size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            No notifications yet
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Notifications will appear here after your first sync cycle.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!isLoading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:opacity-90"
              style={{
                background:   notif.readAt ? 'var(--bg-panel)' : 'var(--bg-elevated)',
                borderColor:  notif.readAt ? 'var(--border)' : 'var(--accent)',
                borderWidth:  notif.readAt ? '1px' : '1px',
                opacity:      notif.readAt ? 0.75 : 1,
              }}
            >
              {/* Type icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: 'var(--bg-elevated)' }}
              >
                {TYPE_ICONS[notif.type] || '🔔'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {notif.title}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.readAt && <BellRing size={12} style={{ color: 'var(--accent)' }} />}
                    {notif.readAt && <CheckCheck size={12} style={{ color: 'var(--text-muted)' }} />}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {relativeTime(notif.receivedAt)}
                    </span>
                  </div>
                </div>
                {notif.body && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {notif.body}
                  </p>
                )}
                {notif.linkedinUrl && (
                  <a
                    href={notif.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-1 inline-block"
                    style={{ color: 'var(--accent)' }}
                  >
                    View on LinkedIn →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
