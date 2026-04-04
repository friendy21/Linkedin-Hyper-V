// FILE: app/(dashboard)/accounts/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AddAccountModal } from '@/components/accounts/AddAccountModal';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { Button } from '@/components/ui/Button';
import { Plus, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/Toast';

interface LinkedInAccount {
  id: string;
  displayName?: string;
  email?: string;
  linkedinProfileId?: string | null;
  status: 'active' | 'expired' | 'pending';
  isActive?: boolean;
  lastSyncedAt?: string | null;
  lastCheckedAt?: string | null;
  createdAt: string;
  rateLimits?: Record<string, { current: number; limit: number; remaining: number }>;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/linkedin-accounts');
      if (res.ok) {
        const data: unknown = await res.json();
        if (typeof data === 'object' && data !== null && 'accounts' in data) {
          setAccounts((data as { accounts: LinkedInAccount[] }).accounts || []);
        }
      }
    } catch (_) {
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/verify`, { method: 'POST' });
      if (res.ok) toast.success('Session verified');
      else toast.error('Verification failed');
    } catch (_) {
      toast.error('Network error');
    }
  };

  const handleReconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/reconnect`, { method: 'POST' });
      if (res.ok) { toast.success('Reconnection queued'); fetchAccounts(); }
      else toast.error('Failed to reconnect');
    } catch (_) {
      toast.error('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/linkedin-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Account removed'); fetchAccounts(); }
      else toast.error('Failed to delete account');
    } catch (_) {
      toast.error('Network error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">LinkedIn Accounts</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Connect and manage your LinkedIn accounts
          </p>
        </div>
        <Button
          id="add-account-trigger"
          variant="primary"
          size="md"
          leftIcon={<Plus size={15} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Account
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && accounts.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--accent-glow)' }}
          >
            <UserCircle size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            No accounts connected
          </h3>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            Connect your first LinkedIn account to start syncing messages and connections.
          </p>
          <Button variant="primary" size="md" leftIcon={<Plus size={15} />} onClick={() => setIsAddModalOpen(true)}>
            Connect Account
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={{
                ...account,
                isActive: account.isActive ?? account.status === 'active',
                lastCheckedAt: account.lastCheckedAt ?? account.lastSyncedAt ?? undefined,
              }}
              onVerify={handleVerify}
              onReconnect={handleReconnect}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddAccountModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={fetchAccounts}
      />
    </motion.div>
  );
}
