// FILE: components/dashboard/StatsGrid.tsx
'use client';

import { Send, UserPlus, Eye, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Stats {
  totalMessages: number;
  totalConnections: number;
  activeAccounts: number;
  totalActivity: number;
}

interface StatCard {
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  tint: string;
  trend?: string;
}

function nameToTint(label: string): string {
  const map: Record<string, string> = {
    Messages:    'rgba(99,102,241,0.15)',
    Connections: 'rgba(16,185,129,0.15)',
    Views:       'rgba(245,158,11,0.15)',
    Searches:    'rgba(14,165,233,0.15)',
  };
  return map[label] || 'rgba(99,102,241,0.12)';
}

function iconColor(label: string): string {
  const map: Record<string, string> = {
    Messages:    '#6366f1',
    Connections: '#10b981',
    Views:       '#f59e0b',
    Searches:    '#0ea5e9',
  };
  return map[label] || '#6366f1';
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function StatsGrid({ stats }: { stats: Stats }) {
  const cards: StatCard[] = [
    { icon: Send,     label: 'Messages',    value: stats.totalMessages,    tint: nameToTint('Messages'),    trend: '' },
    { icon: UserPlus, label: 'Connections', value: stats.totalConnections, tint: nameToTint('Connections'), trend: '' },
    { icon: Eye,      label: 'Views',       value: stats.activeAccounts,   tint: nameToTint('Views'),       trend: '' },
    { icon: Search,   label: 'Searches',    value: stats.totalActivity,    tint: nameToTint('Searches'),    trend: '' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, label, value, tint }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
          whileHover={{ scale: 1.015 }}
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: tint }}
            >
              <Icon size={18} color={iconColor(label)} />
            </div>
          </div>
          <p
            className="text-3xl font-bold tracking-tight mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatNumber(value)}
          </p>
          <p className="label-xs">{label}</p>
        </motion.div>
      ))}
    </div>
  );
}
