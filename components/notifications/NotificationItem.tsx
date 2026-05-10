'use client';

import type { ComponentType } from 'react';
import type { ActivityEntry } from '@/types/dashboard';
import { Avatar } from '@/components/ui/Avatar';
import { AccountBadge } from '@/components/ui/AccountBadge';
import { timeAgo } from '@/lib/utils';
import { deriveDisplayName } from '@/lib/display-name';
import { Bell, Eye, ExternalLink, MessageSquare, RefreshCw, UserPlus } from 'lucide-react';

type ActivityMeta = {
  icon: ComponentType<{ size: number; className?: string }>;
  label: string;
  tone: string;
  bg: string;
};

const TYPE_META: Record<string, ActivityMeta> = {
  messageSent: { icon: MessageSquare, label: 'Message sent', tone: 'text-[var(--accent)]', bg: 'bg-[var(--accent-soft)]' },
  connectionSent: { icon: UserPlus, label: 'Connection sent', tone: 'text-[var(--success)]', bg: 'bg-[var(--success-soft)]' },
  profileViewed: { icon: Eye, label: 'Profile viewed', tone: 'text-[var(--info)]', bg: 'bg-[var(--info-soft)]' },
  sync: { icon: RefreshCw, label: 'Inbox sync', tone: 'text-[var(--warning)]', bg: 'bg-[var(--warning-soft)]' },
};

const FALLBACK_META: ActivityMeta = {
  icon: Bell,
  label: 'Activity',
  tone: 'text-[var(--text-muted)]',
  bg: 'bg-[var(--bg-subtle)]',
};

export function NotificationRow({ entry }: { entry: ActivityEntry }) {
  const typeKey = String(entry.type || '');
  const meta = TYPE_META[typeKey] ?? FALLBACK_META;
  const Icon = meta.icon;
  const isSyncEntry = typeKey === 'sync';
  const displayName = isSyncEntry ? `${entry.accountId} synchronization` : deriveDisplayName(entry.targetName, entry.targetProfileUrl || '');

  const summaryText = (() => {
    if (entry.message) return entry.message;
    if (isSyncEntry && entry.stats) {
      const conversations = Number(entry.stats.conversations || 0);
      const newMessages = Number(entry.stats.newMessages || 0);
      return `${conversations} conversations, ${newMessages} new messages`;
    }
    return '';
  })();

  return (
    <div className="grid gap-3 px-4 py-4 transition-colors hover:bg-[var(--bg-hover)] sm:grid-cols-[1fr_auto] sm:items-start sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <Avatar name={displayName} size="md" />
          <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${meta.bg} ${meta.tone}`}>
            <Icon size={11} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</span>
            <AccountBadge name={entry.accountId} />
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <span className={`font-semibold ${meta.tone}`}>{meta.label}</span>
            {summaryText && <span className="text-[var(--text-muted)]"> - {summaryText}</span>}
          </p>
          {entry.targetProfileUrl && (
            <a href={entry.targetProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-semibold text-[var(--accent)]">
              <ExternalLink size={13} />
              View profile
            </a>
          )}
        </div>
      </div>

      <span className="text-xs text-[var(--text-muted)] sm:pt-1 sm:text-right">{timeAgo(entry.timestamp)}</span>
    </div>
  );
}
