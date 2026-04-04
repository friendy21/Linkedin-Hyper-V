// FILE: components/dashboard/RecentActivity.tsx
'use client';

import { TimeAgo } from '@/components/ui/TimeAgo';

interface ActivityEntry {
  type: string;
  accountId?: string;
  targetName?: string;
  timestamp: number;
  messageLength?: number;
}

const TYPE_CONFIG: Record<string, { color: string; label: (e: ActivityEntry) => string }> = {
  messageSent:    { color: 'var(--success)',    label: (e) => `Sent message to ${e.targetName || 'contact'}` },
  connectionSent: { color: 'var(--accent)',     label: (e) => `Sent connection to ${e.targetName || 'contact'}` },
  profileView:    { color: 'var(--warning)',    label: (e) => `Viewed ${e.targetName || 'a profile'}` },
  sync:           { color: 'var(--text-muted)', label: ()  => 'Inbox synced' },
  realtime_sync:  { color: 'var(--text-muted)', label: ()  => 'Realtime sync' },
};

function Dot({ color }: { color: string }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
      style={{ backgroundColor: color }}
    />
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="18" stroke="var(--border-strong)" strokeWidth="2" />
        <path d="M13 20h14M20 13v14" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity yet</p>
    </div>
  );
}

export function RecentActivity({ activities }: { activities: ActivityEntry[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
      {activities.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-1">
          {activities.slice(0, 10).map((entry, i) => {
            const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.sync;
            return (
              <div key={i} className="flex items-start gap-3 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <Dot color={cfg.color} />
                <div className="flex-1 min-w-0">
                  {entry.accountId && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded mr-2"
                      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      {entry.accountId.slice(-6)}
                    </span>
                  )}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cfg.label(entry)}</span>
                </div>
                <TimeAgo timestamp={new Date(entry.timestamp).toISOString()} className="text-[10px] flex-shrink-0 mt-0.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
