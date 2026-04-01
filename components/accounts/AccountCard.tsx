'use client';

// FILE: components/accounts/AccountCard.tsx
// Shows per-account status badges (active/expired/pending), lastSyncedAt,
// and an inline Reconnect button for expired accounts.

import { useState } from 'react';
import { RateLimitBar } from '../dashboard/RateLimitBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Linkedin, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  BarChart2,
  Copy,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
        style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
      >
        <span className="w-2 h-2 rounded-full bg-[var(--color-success)] status-dot-active" />
        Active
      </span>
    );
  }

  if (status === 'expired') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
      >
        <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
        Expired
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
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

function formatExpiryCountdown(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const expiry = new Date(iso).getTime();
  const now = Date.now();
  const diff = expiry - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `Session expires in ${days}d ${hours}h`;
  }
  return `Session expires in ${hours}h`;
}

export function AccountCard({ account, onRefresh }: Props) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReconnect = async () => {
    setShowReconnectDialog(false);
    setIsReconnecting(true);
    try {
      const res = await fetch(`/api/linkedin-accounts/${account.id}/reconnect`, { method: 'POST' });
      if (res.ok) {
        toast.custom((t) => (
          <Toast type="success" title="Account reconnected" description="Sync will resume shortly" visible={t.visible} />
        ));
        onRefresh();
      } else {
        const data = await res.json();
        toast.custom((t) => (
          <Toast type="error" title="Reconnect failed" description={data.error || 'Unknown error'} visible={t.visible} />
        ));
      }
    } catch {
      toast.custom((t) => (
        <Toast type="error" title="Network error" description="Failed to reconnect account" visible={t.visible} />
      ));
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/linkedin-accounts/${account.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.custom((t) => (
          <Toast type="success" title="Account removed" description="The account was successfully removed." visible={t.visible} />
        ));
        onRefresh();
      } else {
        toast.custom((t) => (
          <Toast type="error" title="Removal failed" description="Failed to remove account from system." visible={t.visible} />
        ));
      }
    } catch {
      toast.custom((t) => (
        <Toast type="error" title="Network error" description="Failed to remove account." visible={t.visible} />
      ));
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

  const copyProfileUrl = () => {
    if (!account.linkedinProfileId) return;
    const url = `https://linkedin.com/in/${account.linkedinProfileId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.custom((t) => (
      <Toast type="success" title="URL copied" description="Profile URL copied to clipboard!" visible={t.visible} />
    ));
  };

  const initials = (account.displayName || account.id).substring(0, 2).toUpperCase();
  const expiryText = formatExpiryCountdown(account.sessionExpiresAt);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border p-5 space-y-4 hover:border-[var(--brand-blue)]/30 transition-all"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-linkedin) 0%, var(--color-linkedin-dark) 100%)', color: 'white' }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 
                className="font-semibold truncate" 
                style={{ color: 'var(--text-primary)' }}
                title={account.displayName}
              >
                {account.displayName || account.linkedinProfileId || 'LinkedIn Account'}
              </h3>
              <StatusBadge status={account.status} />
            </div>

            {account.linkedinProfileId && (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  @{account.linkedinProfileId}
                </p>
                <button
                  onClick={copyProfileUrl}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  title="Copy profile URL"
                >
                  {copied ? (
                    <Check size={10} style={{ color: 'var(--color-success)' }} />
                  ) : (
                    <Copy size={10} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>
            )}

            {account.lastSyncedAt && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Last synced {relativeTime(account.lastSyncedAt)}
              </p>
            )}
            
            {account.status === 'active' && expiryText && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
                {expiryText}
              </p>
            )}
          </div>

          <Linkedin size={18} style={{ color: 'var(--color-linkedin)', flexShrink: 0 }} />
        </div>

        {/* Expired warning + reconnect */}
        {account.status === 'expired' && (
          <div
            className="flex items-center justify-between gap-3 p-3 rounded-lg"
            style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
              <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
                Session expired — reconnect to resume syncing
              </p>
            </div>
            <button
              onClick={() => setShowReconnectDialog(true)}
              disabled={isReconnecting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 shrink-0"
              style={{ background: 'var(--color-danger)', color: 'white' }}
            >
              {isReconnecting ? <Loader2 size={12} className="animate-spin" /> : 'Reconnect'}
            </button>
          </div>
        )}

        {/* Rate limits (lazy loaded) */}
        <AnimatePresence mode="wait">
          {!rateLimits && !limitsLoading && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={loadRateLimits}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <BarChart2 size={14} />
              View Usage Limits
            </motion.button>
          )}
          {limitsLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <Loader2 size={12} className="animate-spin" /> Loading limits…
            </motion.div>
          )}
          {rateLimits && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {rateLimits.messagesSent && (
                <RateLimitBar label="Messages" current={rateLimits.messagesSent.current} limit={rateLimits.messagesSent.limit} resetsAt={rateLimits.messagesSent.resetsAt} />
              )}
              {rateLimits.connectRequests && (
                <RateLimitBar label="Connections" current={rateLimits.connectRequests.current} limit={rateLimits.connectRequests.limit} resetsAt={rateLimits.connectRequests.resetsAt} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {account.status !== 'expired' && (
            <button
              onClick={() => setShowReconnectDialog(true)}
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
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            title="Remove account"
            className="ml-auto px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 hover:bg-red-500/10"
            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Remove
          </button>
        </div>
      </motion.div>

      {/* Reconnect Confirmation Dialog */}
      <ConfirmDialog
        open={showReconnectDialog}
        onOpenChange={setShowReconnectDialog}
        title={`Re-authenticate ${account.displayName}?`}
        description="This will open LinkedIn in a new tab to complete authentication. Keep the new tab open until it completes."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleReconnect}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Remove ${account.displayName}?`}
        description="This cannot be undone. The account's sync history will be preserved but no new activity will be captured."
        confirmLabel="Remove Account"
        cancelLabel="Keep Account"
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </>
  );
}
