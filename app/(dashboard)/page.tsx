// FILE: app/(dashboard)/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { AccountStatusRow } from '@/components/dashboard/AccountStatusRow';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StatsGridSkeleton, ActivityListSkeleton } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';

interface DashboardStats {
  totalMessages: number;
  totalConnections: number;
  activeAccounts: number;
  totalActivity: number;
}

interface Account {
  id: string;
  displayName?: string;
  email?: string;
  status?: string;
  isActive?: boolean;
  rateLimits?: Record<string, { current: number; limit: number; remaining: number }>;
  lastCheckedAt?: string;
}

interface ActivityEntry {
  type: string;
  accountId?: string;
  targetName?: string;
  timestamp: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalConnections: 0,
    activeAccounts: 0,
    totalActivity: 0,
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);

      const [accountsRes, statsRes] = await Promise.all([
        fetch('/api/accounts', { signal }),
        fetch('/api/stats/all/summary', { signal }),
      ]);

      if (!accountsRes.ok) throw new Error(`Accounts fetch failed: ${accountsRes.status}`);
      if (!statsRes.ok) throw new Error(`Stats fetch failed: ${statsRes.status}`);

      const accountsData = await accountsRes.json();
      const statsData = await statsRes.json();
      const accountsList: Account[] = accountsData.accounts || [];
      setAccounts(accountsList);

      setStats({
        totalMessages: statsData.totalMessages || 0,
        totalConnections: statsData.totalConnections || 0,
        activeAccounts: accountsList.filter((a) => a.isActive).length,
        totalActivity: (statsData.totalMessages || 0) + (statsData.totalConnections || 0),
      });

      const activityResults = await Promise.allSettled(
        accountsList.map((account) =>
          fetch(`/api/stats/${account.id}/activity?limit=5`, { signal })
            .then((r) => (r.ok ? r.json() : { entries: [] }))
            .catch(() => ({ entries: [] }))
        )
      );

      const all: ActivityEntry[] = [];
      activityResults.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.entries) all.push(...r.value.entries);
      });
      all.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(all.slice(0, 10));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchDashboardData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ErrorState title="Failed to load dashboard" message={error} onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            {greeting}{user?.name ? `, ${(user.name as string).split(' ')[0]}` : ''}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {isLoading ? <StatsGridSkeleton /> : <StatsGrid stats={stats} />}

      {/* Account status */}
      {!isLoading && <AccountStatusRow accounts={accounts} />}

      {/* Recent activity */}
      {isLoading ? <ActivityListSkeleton rows={5} /> : <RecentActivity activities={activities} />}
    </motion.div>
  );
}
