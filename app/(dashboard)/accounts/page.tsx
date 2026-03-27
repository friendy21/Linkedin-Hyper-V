// FILE: app/(dashboard)/accounts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AddAccountModal } from '@/components/accounts/AddAccountModal';
import { Plus, Loader2, Linkedin } from 'lucide-react';

interface LinkedInAccount {
  id: string;
  displayName: string;
  linkedinProfileId?: string | null;
  status: 'active' | 'expired' | 'pending';
  lastSyncedAt?: string | null;
  sessionExpiresAt?: string | null;
  createdAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/linkedin-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            LinkedIn Accounts
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Connect and manage your LinkedIn accounts
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ background: '#0A66C2', color: 'white' }}
        >
          <Plus size={18} />
          Add Account
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && accounts.length === 0 && (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#0A66C2' }}
          >
            <Linkedin size={32} color="white" />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No LinkedIn Accounts Connected
          </h3>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Connect your first LinkedIn account to start syncing messages, connections, and notifications.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-2.5 rounded-lg font-medium"
            style={{ background: '#0A66C2', color: 'white' }}
          >
            Connect LinkedIn Account
          </button>
        </div>
      )}

      {/* Account Grid */}
      {!isLoading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRefresh={fetchAccounts}
            />
          ))}
        </div>
      )}

      <AddAccountModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => { fetchAccounts(); setIsAddModalOpen(false); }}
      />
    </div>
  );
}
