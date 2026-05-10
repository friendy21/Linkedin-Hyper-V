// FILE: app/(dashboard)/accounts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AddAccountModal } from '@/components/accounts/AddAccountModal';
import { Plus, Loader2, UserCircle } from 'lucide-react';
import type { Account } from '@/types/dashboard';
import { ExportButton } from '@/components/ui/ExportButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/accounts');
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

  const handleOpenAddModal = (accountId?: string) => {
    if (accountId) {
      setSelectedAccountId(accountId);
    }
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedAccountId(null);
  };

  return (
    <div className="min-h-full">
      <PageHeader
        title="Accounts"
        description="Manage LinkedIn sessions, cookie imports, verification, and per-account safety limits."
        actions={
          <>
          <ExportButton 
            type="activity" 
            label="Export"
            size="sm"
          />
          <Button
            onClick={() => handleOpenAddModal()}
            size="sm"
          >
            <Plus size={18} />
            Add Account
          </Button>
          </>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">

      {/* Loading State */}
      {isLoading && (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading accounts...
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && accounts.length === 0 && (
        <div className="app-surface">
          <EmptyState
            icon={<UserCircle size={24} />}
            title="No accounts yet"
            description="Add a LinkedIn account and import browser session cookies to begin using the dashboard."
            action={<Button onClick={() => handleOpenAddModal()}><Plus size={16} />Add your first account</Button>}
          />
        </div>
      )}

      {/* Account Grid */}
      {!isLoading && accounts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRefresh={fetchAccounts}
              onImport={handleOpenAddModal}
            />
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      <AddAccountModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSuccess={fetchAccounts}
        existingAccounts={accounts.map((a) => a.id)}
        initialAccountId={selectedAccountId}
      />
      </div>
    </div>
  );
}
