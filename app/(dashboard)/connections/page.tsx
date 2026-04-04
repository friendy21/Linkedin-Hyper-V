// FILE: app/(dashboard)/connections/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectionGrid } from '@/components/connections/ConnectionGrid';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/Toast';

interface Connection {
  id: string;
  name: string;
  headline?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  linkedInAccountId: string;
  accountDisplayName?: string;
}

interface Account {
  id: string;
  displayName?: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [connRes, accRes] = await Promise.all([
        fetch('/api/connections'),
        fetch('/api/linkedin-accounts'),
      ]);

      if (connRes.ok) {
        const data: unknown = await connRes.json();
        const list = Array.isArray(data)
          ? data as Connection[]
          : (typeof data === 'object' && data !== null && 'connections' in data)
          ? (data as { connections: Connection[] }).connections
          : [];
        setConnections(list);
      }

      if (accRes.ok) {
        const data: unknown = await accRes.json();
        if (typeof data === 'object' && data !== null && 'accounts' in data) {
          setAccounts((data as { accounts: Account[] }).accounts || []);
        }
      }
    } catch (_) {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="page-title">Network</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {loading ? '…' : `${connections.length} connections across all accounts`}
        </p>
      </div>

      <ConnectionGrid
        connections={connections}
        accounts={accounts}
        loading={loading}
      />
    </motion.div>
  );
}
