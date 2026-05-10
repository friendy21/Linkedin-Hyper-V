'use client';

import type { ActivityEntry, Account, ActivityTab } from '@/types/dashboard';
import { NotificationRow } from './NotificationItem';
import { AccountBadge } from '@/components/ui/AccountBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { Bell } from 'lucide-react';

const TABS: { id: ActivityTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'messageSent', label: 'Messages' },
  { id: 'connectionSent', label: 'Connections' },
  { id: 'profileViewed', label: 'Views' },
  { id: 'sync', label: 'Sync' },
];

interface NotificationFeedProps {
  entries: ActivityEntry[];
  accounts: Account[];
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  totalUnread: number;
}

export function NotificationFeed({
  entries,
  accounts,
  activeTab,
  onTabChange,
  totalUnread,
}: NotificationFeedProps) {
  const options = TABS.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: tab.id === 'all' ? totalUnread : undefined,
  }));

  return (
    <div className="space-y-4">
      <div className="app-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterBar options={options} value={activeTab} onChange={(value) => onTabChange(value as ActivityTab)} />
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((account) => (
              <AccountBadge key={account.id} name={account.displayName || account.id} />
            ))}
          </div>
        </div>
      </div>

      <div className="app-surface overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState icon={<Bell size={22} />} title="No activity entries" description="Activity matching the current filter will appear here." />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {entries.map((entry, index) => (
              <NotificationRow key={`${entry.accountId}-${entry.timestamp}-${index}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
