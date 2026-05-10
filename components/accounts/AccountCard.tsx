'use client';

import { useState } from 'react';
import { SessionStatus } from './SessionStatus';
import { RateLimitBar } from '../dashboard/RateLimitBar';
import { Button } from '@/components/ui/Button';
import { Loader2, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Account } from '@/types/dashboard';

interface RateLimits {
  messagesSent?: { current: number; limit: number; resetsAt?: number };
  connectRequests?: { current: number; limit: number; resetsAt?: number };
  searchQueries?: { current: number; limit: number; resetsAt?: number };
}

interface AccountCardProps {
  account: Account;
  onRefresh: () => void;
  onImport: (accountId: string) => void;
}

export function AccountCard({ account, onRefresh, onImport }: AccountCardProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);

  const loadRateLimits = async () => {
    setLimitsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/limits`);
      if (res.ok) setRateLimits(await res.json());
    } catch {
      toast.error('Failed to load rate limits');
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/verify`, { method: 'POST' });
      if (res.ok) {
        toast.success(`Session verified for ${account.id}`);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Network error during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete session for ${account.id}?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/session`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Session deleted for ${account.id}`);
        onRefresh();
      } else {
        toast.error('Failed to delete session');
      }
    } catch {
      toast.error('Network error during deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="app-surface flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{account.displayName || account.id}</h3>
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{account.id}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
          {(account.displayName || account.id).substring(0, 2).toUpperCase()}
        </div>
      </div>

      <div className="mt-4">
        <SessionStatus isActive={account.isActive} hasSession={!!account.lastSeen} lastSeen={account.lastSeen} />
      </div>

      <div className="mt-5 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
        {!rateLimits && !limitsLoading && (
          <button onClick={loadRateLimits} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-6 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)]">
            <ShieldCheck size={16} />
            Load rate limits
          </button>
        )}

        {limitsLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            Loading limits
          </div>
        )}

        {rateLimits && (
          <div className="space-y-4">
            {rateLimits.messagesSent && <RateLimitBar label="Messages" current={rateLimits.messagesSent.current} limit={rateLimits.messagesSent.limit} resetsAt={rateLimits.messagesSent.resetsAt} />}
            {rateLimits.connectRequests && <RateLimitBar label="Connection requests" current={rateLimits.connectRequests.current} limit={rateLimits.connectRequests.limit} resetsAt={rateLimits.connectRequests.resetsAt} />}
            {rateLimits.searchQueries && <RateLimitBar label="Search queries" current={rateLimits.searchQueries.current} limit={rateLimits.searchQueries.limit} resetsAt={rateLimits.searchQueries.resetsAt} />}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-[var(--border)] pt-4">
        <Button onClick={() => onImport(account.id)} variant="primary" size="sm">
          <Upload size={14} />
          Cookies
        </Button>
        <Button onClick={handleVerify} disabled={isVerifying} variant="secondary" size="icon" aria-label="Verify session">
          {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </Button>
        <Button onClick={handleDelete} disabled={isDeleting} variant="danger" size="icon" aria-label="Delete session">
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </Button>
      </div>
    </div>
  );
}
