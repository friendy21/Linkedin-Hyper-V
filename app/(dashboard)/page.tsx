// FILE: app/(dashboard)/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';

interface DashboardStats {
  totalMessages: number;
  totalConnections: number;
  activeAccounts: number;
  totalActivity: number;
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
      
      // Fetch accounts with abort signal
      const accountsRes = await fetch('/api/accounts', { signal });
      if (!accountsRes.ok) {
        throw new Error(`Failed to fetch accounts: ${accountsRes.status}`);
      }
      const accountsData = await accountsRes.json();
      const accountsList = accountsData.accounts || [];
      setAccounts(accountsList);

      // Fetch overall stats with abort signal
      const statsRes = await fetch('/api/stats/all/summary', { signal });
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: ${statsRes.status}`);
      }
      const statsData = await statsRes.json();
      
      setStats({
        totalMessages: statsData.totalMessages || 0,
        totalConnections: statsData.totalConnections || 0,
        activeAccounts: accountsList.filter((a: Account) => a.isActive).length,
        totalActivity: (statsData.totalMessages || 0) + (statsData.totalConnections || 0),
      });

      // Fetch recent activities from all accounts
      const activitiesPromises = accountsList.map((account: Account) =>
        fetch(`/api/stats/${account.id}/activity?limit=5`, { signal })
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch activity for ${account.id}`);
            return res.json();
          })
          .catch(() => ({ entries: [] })) // Gracefully handle individual account failures
      );
      
      const activitiesResults = await Promise.allSettled(activitiesPromises);
      const allActivities: ActivityEntry[] = [];
      
      activitiesResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.entries) {
          allActivities.push(...result.value.entries);
        }
      });

      // Sort by timestamp and take top 10
      allActivities.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(allActivities.slice(0, 10));

    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format date
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <ErrorState
          title="Failed to load dashboard"
          message={error}
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="page-title">
            {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {formatDate()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-white/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="text-sm">Refresh</span>
        </button>
      </motion.div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="card" count={4} />
        </div>
      ) : (
        <StatsGrid stats={stats} />
      )}

      {/* Account Status */}
      {isLoading ? (
        <div className="flex gap-3">
          <Skeleton variant="pill" count={3} />
        </div>
      ) : (
        <AccountStatusRow accounts={accounts} />
      )}

      {/* Recent Activity */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton variant="row" count={5} />
        </div>
      ) : (
        <RecentActivity activities={activities} />
      )}
    </div>
  );
}
