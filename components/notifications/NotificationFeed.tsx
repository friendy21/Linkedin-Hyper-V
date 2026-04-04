// FILE: components/notifications/NotificationFeed.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Users, MessageSquare, Eye, Briefcase, AtSign, Heart, ChevronRight } from 'lucide-react';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { ActivityListSkeleton } from '@/components/ui/SkeletonLoader';
import { useWebSocket } from '@/components/providers/WebSocketProvider';
import { toast } from '@/components/ui/Toast';

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
  notification: Omit<Notification, 'id' | 'linkedInAccountId'>;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  connection:  { icon: Users,         color: '#6366f1', label: 'Connections' },
  message:     { icon: MessageSquare, color: '#10b981', label: 'Messages' },
  view:        { icon: Eye,           color: '#f59e0b', label: 'Profile Views' },
  profileView: { icon: Eye,           color: '#f59e0b', label: 'Profile Views' },
  job:         { icon: Briefcase,     color: '#0ea5e9', label: 'Jobs' },
  mention:     { icon: AtSign,        color: '#8b5cf6', label: 'Mentions' },
  reaction:    { icon: Heart,         color: '#ec4899', label: 'Reactions' },
  other:       { icon: Bell,          color: '#475569', label: 'Other' },
};

const TABS = ['All', 'Connections', 'Messages', 'Profile Views', 'Other'] as const;
type Tab = typeof TABS[number];

function formatDaySeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

interface NotificationFeedProps {
  notifications: Notification[];
  loading?: boolean;
  onMarkAllRead?: () => void;
}

export function NotificationFeed({ notifications, loading = false, onMarkAllRead }: NotificationFeedProps) {
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());

  const filtered = notifications.filter(n => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Connections') return n.type === 'connection';
    if (activeTab === 'Messages') return n.type === 'message';
    if (activeTab === 'Profile Views') return n.type === 'view' || n.type === 'profileView';
    return n.type !== 'connection' && n.type !== 'message' && n.type !== 'view' && n.type !== 'profileView';
  });

  const handleMarkAll = () => {
    const ids = new Set(notifications.map(n => n.id));
    setLocalRead(ids);
    onMarkAllRead?.();
    toast.success('All notifications marked as read');
  };

  if (loading) return <ActivityListSkeleton rows={6} />;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab ? 'var(--accent-glow)' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                border: activeTab === tab ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          onClick={handleMarkAll}
          className="text-xs hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Mark all read
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <Bell size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications in this category</p>
        </div>
      )}

      <div className="flex flex-col gap-0">
        {filtered.map((notif, i) => {
          const prevNotif = filtered[i - 1];
          const showDay = !prevNotif || !isSameDay(prevNotif.receivedAt, notif.receivedAt);
          const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.other;
          const Icon = cfg.icon;
          const unread = !notif.readAt && !localRead.has(notif.id);

          return (
            <div key={notif.id}>
              {showDay && (
                <div
                  className="sticky top-0 py-2 px-4 text-xs font-medium z-10 -mx-1"
                  style={{
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-base)',
                  }}
                >
                  {formatDaySeparator(notif.receivedAt)}
                </div>
              )}
              <div
                className="flex items-start gap-3 px-3 py-3 rounded-xl transition-colors group"
                style={{
                  backgroundColor: unread ? 'rgba(99,102,241,0.04)' : 'transparent',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = unread ? 'rgba(99,102,241,0.04)' : 'transparent')}
              >
                {/* Unread dot */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                  style={{ backgroundColor: unread ? 'var(--accent)' : 'transparent' }}
                />

                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cfg.color}20` }}
                >
                  <Icon size={16} style={{ color: cfg.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{notif.title}</p>
                  {notif.body && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{notif.body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <TimeAgo timestamp={notif.receivedAt} className="text-[10px]" />
                    {notif.accountDisplayName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {notif.accountDisplayName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Link chevron */}
                {notif.linkedinUrl && (
                  <a href={notif.linkedinUrl} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
