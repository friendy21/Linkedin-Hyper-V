'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Connection, Account } from '@/types/dashboard';
import { getAccounts, getUnifiedConnections } from '@/lib/api-client';
import { ConnectionGrid } from '@/components/connections/ConnectionGrid';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts,    setAccounts]    = useState<Account[]>([]);
  const [search,      setSearch]      = useState('');
  // F6 — Debounced copy of search to avoid per-keystroke full-array scans
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter,      setFilter]      = useState<string>('all');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // F6 — 150 ms debounce: update debouncedSearch only after the user pauses typing
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const [{ accounts: accs }, { connections: unifiedConnections }] = await Promise.all([
        getAccounts(),
        getUnifiedConnections(500),
      ]);
      setAccounts(accs);
      const all = unifiedConnections
        .sort((a, b) => (b.connectedAt ?? 0) - (a.connectedAt ?? 0));

      setConnections(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // No polling — connections page is a static view, refresh on mount only
  }, [load]);

  // F6 — useMemo so the filtered list is recomputed only when the debounced
  // search string, filter pill, or underlying connections array changes.
  const filtered = useMemo(
    () =>
      connections
        .filter((c) => filter === 'all' || c.accountId === filter)
        .filter((c) => c.name.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [connections, filter, debouncedSearch]
  );

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Connections"
        description={`${connections.length.toLocaleString()} stored connection${connections.length === 1 ? '' : 's'} across ${accounts.length} account${accounts.length === 1 ? '' : 's'}.`}
      />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <ConnectionGrid
          connections={filtered}
          accounts={accounts}
          total={connections.length}
          search={search}
          filter={filter}
          onSearchChange={setSearch}
          onFilterChange={setFilter}
        />
      </div>
    </div>
  );
}
