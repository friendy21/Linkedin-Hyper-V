'use client';

// FILE: components/accounts/AccountCard.tsx
// Shows per-account status badges (active/expired/pending), lastSyncedAt,
// and an inline Reconnect button for expired accounts.

import { useState } from 'react';
import { RateLimitBar } from '../dashboard/RateLimitBar';
import { Loader2, RefreshCw, Trash2, Linkedin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface LinkedInAccount {
  id: string;
  displayName: string;
  linkedinProfileId?: string | null;
  status: 'active' | 'expired' | 'pending';
  lastSyncedAt?: string | null;
  sessionExpiresAt?: string | null;
  createdAt: string;
}

interface RateLimits {
  messagesSent?: { current: number; limit: number; resetsAt?: number };
  connectRequests?: { current: number; limit: number; resetsAt?: number };
  searchQueries?: { current: number; limit: number; resetsAt?: number };
}

interface Props {
  account: LinkedInAccount;
  onRefresh: () => void;
}

function StatusBadge({ status }: { status: LinkedInAccount['status'] }) {
  if (status === 'active') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
      >
        <CheckCircle2 size={11} />
        Active
      </span>
    );
  }

  if (status === 'expired') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
      >
        <AlertTriangle size={11} />
        Expired
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}
    >
      <Clock size={11} />
      Pending
    </span>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AccountCard({ account, onRefresh }: Props) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);

  const handleReconnect = async () => {
    if (!confirm('This will open a new LinkedIn login window. Continue?')) return;
    setIsReconnecting(true);
    try {
      const res = await fetch(`/api/linkedin-accounts/${account.id}/reconnect`, { method: 'POST' });
      if (res.ok) {
        toast.success('Account reconnected successfully!');
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Reconnect failed');
      }
    } catch {
      toast.error('Network error during reconnect');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove LinkedIn account "${account.displayName || account.id}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/linkedin-accounts/${account.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Account removed.');
        onRefresh();
      } else {
        toast.error('Failed to remove account');
      }
    } catch {
      toast.error('Network error during removal');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadRateLimits = async () => {
    setLimitsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/limits`);
      if (res.ok) setRateLimits(await res.json());
    } catch { /* silent */ } finally {
      setLimitsLoading(false);
    }
  };

  const initials = (account.displayName || account.id).substring(0, 2).toUpperCase();

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)', color: 'white' }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {account.displayName || account.linkedinProfileId || 'LinkedIn Account'}
            </h3>
            <StatusBadge status={account.status} />
          </div>

          {account.linkedinProfileId && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              @{account.linkedinProfileId}
            </p>
          )}

          {account.lastSyncedAt && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Last synced {relativeTime(account.lastSyncedAt)}
            </p>
          )}
        </div>

        <Linkedin size={18} style={{ color: '#0A66C2', flexShrink: 0 }} />
      </div>

      {/* Expired warning + reconnect */}
      {account.status === 'expired' && (
        <div
          className="flex items-center justify-between gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
            <p className="text-xs" style={{ color: '#ef4444' }}>
              Session expired — reconnect to resume syncing
            </p>
          </div>
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 shrink-0"
            style={{ background: '#ef4444', color: 'white' }}
          >
            {isReconnecting ? <Loader2 size={12} className="animate-spin" /> : 'Reconnect'}
          </button>
        </div>
      )}

      {/* Rate limits (lazy loaded) */}
      {!rateLimits && !limitsLoading && (
        <button
          onClick={loadRateLimits}
          className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          Load Rate Limits
        </button>
      )}
      {limitsLoading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={12} className="animate-spin" /> Loading limits…
        </div>
      )}
      {rateLimits && (
        <div className="space-y-2">
          {rateLimits.messagesSent && (
            <RateLimitBar label="Messages" current={rateLimits.messagesSent.current} limit={rateLimits.messagesSent.limit} resetsAt={rateLimits.messagesSent.resetsAt} />
          )}
          {rateLimits.connectRequests && (
            <RateLimitBar label="Connections" current={rateLimits.connectRequests.current} limit={rateLimits.connectRequests.limit} resetsAt={rateLimits.connectRequests.resetsAt} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        {account.status !== 'expired' && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            title="Re-authenticate LinkedIn"
            className="px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {isReconnecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          title="Remove account"
          className="ml-auto px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
          style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Remove
        </button>
      </div>
    </div>
  );
}
