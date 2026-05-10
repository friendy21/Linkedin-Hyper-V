'use client';

import type { Connection, Account } from '@/types/dashboard';
import { Avatar } from '@/components/ui/Avatar';
import { AccountBadge } from '@/components/ui/AccountBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { timeAgo } from '@/lib/utils';
import { ExternalLink, Search, Users } from 'lucide-react';

interface ConnectionGridProps {
  connections: Connection[];
  accounts: Account[];
  total: number;
  search: string;
  filter: string;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: string) => void;
}

export function ConnectionGrid({
  connections,
  accounts,
  total,
  search,
  filter,
  onSearchChange,
  onFilterChange,
}: ConnectionGridProps) {
  const filterOptions = [
    { value: 'all', label: 'All accounts', count: total },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.displayName || account.id,
      count: connections.filter((connection) => connection.accountId === account.id).length,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="app-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search connections"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="app-input h-10 pl-9 pr-3 text-sm"
            />
          </div>
          <FilterBar options={filterOptions} value={filter} onChange={onFilterChange} className="lg:justify-end" />
        </div>
      </div>

      <div className="app-surface overflow-hidden">
        {connections.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="No connections found" description="Try another account filter or search term." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-collapse">
                <thead className="bg-[var(--bg-subtle)]">
                  <tr className="border-b border-[var(--border)]">
                    {['Person', 'Account', 'Connected', 'Profile'].map((header) => (
                      <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {connections.map((connection, index) => (
                    <tr key={`${connection.accountId}-${connection.profileUrl}-${index}`} className="transition-colors hover:bg-[var(--bg-hover)]">
                      <td className="px-5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={connection.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{connection.name}</p>
                            {connection.headline && <p className="truncate text-xs text-[var(--text-muted)]">{connection.headline}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <AccountBadge name={connection.accountId} />
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--text-muted)]">
                        {connection.connectedAt ? timeAgo(connection.connectedAt) : 'Unknown'}
                      </td>
                      <td className="px-5 py-3">
                        {connection.profileUrl ? (
                          <a href={connection.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
                            <ExternalLink size={14} />
                            View
                          </a>
                        ) : (
                          <span className="text-sm text-[var(--text-faint)]">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--border)] md:hidden">
              {connections.map((connection, index) => (
                <div key={`${connection.accountId}-${connection.profileUrl}-${index}`} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={connection.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{connection.name}</p>
                      {connection.headline && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{connection.headline}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <AccountBadge name={connection.accountId} />
                        <span className="text-xs text-[var(--text-muted)]">{connection.connectedAt ? timeAgo(connection.connectedAt) : 'Unknown date'}</span>
                      </div>
                    </div>
                    {connection.profileUrl && (
                      <a href={connection.profileUrl} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--accent)]">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
