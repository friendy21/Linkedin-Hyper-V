'use client';

import { Activity, MessageSquare, TrendingUp, Users } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalMessages: number;
    totalConnections: number;
    activeAccounts: number;
    totalActivity: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    { label: 'Messages', value: stats.totalMessages, icon: MessageSquare, tone: 'text-[var(--accent)]', bg: 'bg-[var(--accent-soft)]' },
    { label: 'Connections', value: stats.totalConnections, icon: Users, tone: 'text-[var(--success)]', bg: 'bg-[var(--success-soft)]' },
    { label: 'Active accounts', value: stats.activeAccounts, icon: TrendingUp, tone: 'text-[var(--info)]', bg: 'bg-[var(--info-soft)]' },
    { label: 'Total actions', value: stats.totalActivity, icon: Activity, tone: 'text-[var(--warning)]', bg: 'bg-[var(--warning-soft)]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="app-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{card.value.toLocaleString()}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg} ${card.tone}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
