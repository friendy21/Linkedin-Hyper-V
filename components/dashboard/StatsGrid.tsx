// FILE: components/dashboard/StatsGrid.tsx
'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Users, Activity, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalMessages: number;
    totalConnections: number;
    activeAccounts: number;
    totalActivity: number;
  };
  trends?: {
    messagesTrend?: number;
    connectionsTrend?: number;
    accountsTrend?: number;
    activityTrend?: number;
  };
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
  trend?: number;
  index: number;
}

function StatCard({ label, value, icon: Icon, color, bgColor, trend, index }: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = hasTrend && trend >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ 
        y: -4,
        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
      }}
      className="rounded-xl border p-6 transition-all cursor-default group"
      style={{ 
        background: 'var(--bg-panel)', 
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: bgColor }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        
        {/* Trend indicator */}
        {hasTrend && (
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{ 
              background: isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div>
        <div 
          className="text-3xl font-bold mb-1" 
          style={{ color: 'var(--text-primary)' }}
        >
          {value.toLocaleString()}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {label}
          </div>
          {!hasTrend && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              --
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function StatsGrid({ stats, trends }: StatsGridProps) {
  const cards = [
    {
      label: 'Messages Sent',
      value: stats.totalMessages,
      icon: MessageSquare,
      color: '#3b82f6',
      bgColor: 'var(--color-info-bg)',
      trend: trends?.messagesTrend,
    },
    {
      label: 'Connections Sent',
      value: stats.totalConnections,
      icon: Users,
      color: '#22c55e',
      bgColor: 'var(--color-success-bg)',
      trend: trends?.connectionsTrend,
    },
    {
      label: 'Active Accounts',
      value: stats.activeAccounts,
      icon: TrendingUp,
      color: '#f59e0b',
      bgColor: 'var(--color-warning-bg)',
      trend: trends?.accountsTrend,
    },
    {
      label: 'Total Activity',
      value: stats.totalActivity,
      icon: Activity,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      trend: trends?.activityTrend,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          color={card.color}
          bgColor={card.bgColor}
          trend={card.trend}
          index={index}
        />
      ))}
    </div>
  );
}
