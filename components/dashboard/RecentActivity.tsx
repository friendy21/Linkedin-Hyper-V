'use client';

import { ExternalLink, Eye, MessageSquare, UserPlus } from 'lucide-react';
import type { ActivityEntry } from '@/types/dashboard';
import { deriveDisplayName } from '@/lib/display-name';
import { timeAgo } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { AccountBadge } from '@/components/ui/AccountBadge';

interface RecentActivityProps {
  activities: ActivityEntry[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getMeta = (type: ActivityEntry['type']) => {
    switch (type) {
      case 'messageSent':
        return { icon: MessageSquare, label: 'Message', color: 'text-[var(--accent)]', bg: 'bg-[var(--accent-soft)]' };
      case 'connectionSent':
        return { icon: UserPlus, label: 'Connection', color: 'text-[var(--success)]', bg: 'bg-[var(--success-soft)]' };
      case 'profileViewed':
        return { icon: Eye, label: 'Profile view', color: 'text-[var(--info)]', bg: 'bg-[var(--info-soft)]' };
      default:
        return { icon: MessageSquare, label: 'Activity', color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-subtle)]' };
    }
  };

  if (activities.length === 0) {
    return (
      <div className="app-surface">
        <EmptyState title="No recent activity" description="Messages, connections, profile views, and sync events will appear here." />
      </div>
    );
  }

  return (
    <div className="app-surface overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent activity</h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {activities.slice(0, 10).map((activity, index) => {
          const meta = getMeta(activity.type);
          const Icon = meta.icon;
          const displayName = deriveDisplayName(activity.targetName, activity.targetProfileUrl || '');

          return (
            <div key={`${activity.accountId}-${activity.timestamp}-${index}`} className="grid gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</span>
                    <AccountBadge name={activity.accountId} />
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm text-[var(--text-secondary)]">{displayName}</p>
                    {activity.targetProfileUrl && (
                      <a href={activity.targetProfileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[var(--accent)]" aria-label="Open profile">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {activity.message && <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{activity.message}</p>}
                </div>
              </div>
              <span className="text-xs text-[var(--text-muted)] sm:text-right">{timeAgo(activity.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
