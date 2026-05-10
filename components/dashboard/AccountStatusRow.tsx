'use client';

import type { Account } from '@/types/dashboard';
import { StatusPill } from '@/components/ui/StatusPill';

interface AccountStatusRowProps {
  accounts: Account[];
  onAccountClick?: (accountId: string) => void;
}

export function AccountStatusRow({ accounts, onAccountClick }: AccountStatusRowProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="app-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Account health</h2>
          <p className="text-xs text-[var(--text-muted)]">{accounts.length} configured account{accounts.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const tone = account.isActive ? 'success' : account.lastSeen ? 'warning' : 'danger';
          const label = account.isActive ? 'Active' : account.lastSeen ? 'Needs attention' : 'No session';

          return (
            <button
              key={account.id}
              onClick={() => onAccountClick?.(account.id)}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
            >
              <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{account.displayName || account.id}</span>
              <StatusPill tone={tone} dot>{label}</StatusPill>
            </button>
          );
        })}
      </div>
    </div>
  );
}
