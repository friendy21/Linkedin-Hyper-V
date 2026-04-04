// FILE: components/dashboard/AccountStatusRow.tsx
'use client';

import { TimeAgo } from '@/components/ui/TimeAgo';

interface RateLimitData {
  current: number;
  limit: number;
  remaining: number;
}

interface RateLimits {
  messagesSent?: RateLimitData;
  connectRequests?: RateLimitData;
  profileViews?: RateLimitData;
}

interface Account {
  id: string;
  displayName?: string;
  email?: string;
  status?: string;
  isActive?: boolean;
  rateLimits?: RateLimits;
  lastCheckedAt?: string;
  createdAt?: string;
}

function nameToColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9','#ef4444'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusBadge({ status, isActive }: { status?: string; isActive?: boolean }) {
  const active = isActive || status === 'active';
  const expired = status === 'expired' || status === 'inactive' || (!isActive && status !== 'warning');
  const warning = status === 'warning' || status === 'needs_action';

  if (active) return (
    <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>
      <span className="w-1.5 h-1.5 rounded-full status-dot-active" style={{ backgroundColor: 'var(--success)' }} />
      Active
    </span>
  );
  if (warning) return (
    <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: 'var(--warning)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--warning)' }} />
      Warning
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--danger)' }} />
      Expired
    </span>
  );
}

function RateLimitBar({ current, limit }: { current: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const color = pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-strong)' }}>
      <div style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: 9999, transition: 'width 0.4s ease' }} />
    </div>
  );
}

export function AccountStatusRow({ accounts }: { accounts: Account[] }) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No accounts linked</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Account Status</h2>
      <div className="flex flex-col gap-3">
        {accounts.map((account) => {
          const name = account.displayName || account.email || account.id;
          const bg = nameToColor(name);
          const rl = account.rateLimits;
          const msgPct = rl?.messagesSent
            ? Math.round((rl.messagesSent.current / rl.messagesSent.limit) * 100)
            : 0;

          return (
            <div
              key={account.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-shadow"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: bg }}
              >
                {getInitials(name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                  <StatusBadge status={account.status} isActive={account.isActive} />
                </div>
                {account.email && (
                  <p className="text-xs truncate mb-1.5" style={{ color: 'var(--text-muted)' }}>{account.email}</p>
                )}
                {rl?.messagesSent && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      Msgs {rl.messagesSent.current}/{rl.messagesSent.limit}
                    </span>
                    <div className="flex-1">
                      <RateLimitBar current={rl.messagesSent.current} limit={rl.messagesSent.limit} />
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              {account.lastCheckedAt && (
                <div className="flex-shrink-0 text-right">
                  <TimeAgo timestamp={account.lastCheckedAt} className="text-[10px]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
