// FILE: components/accounts/AccountCard.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, RefreshCw, Shield, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RateLimitAction {
  current: number;
  limit: number;
  remaining: number;
}

interface Account {
  id: string;
  displayName?: string;
  email?: string;
  status?: string;
  isActive?: boolean;
  rateLimits?: Record<string, RateLimitAction>;
  lastCheckedAt?: string;
  createdAt?: string;
  proxyUrl?: string;
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

function RateLimitBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const color = pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{label}</span>
        <span>{current}/{limit}</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  );
}

interface AccountCardProps {
  account: Account;
  onVerify?: (id: string) => void;
  onReconnect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function AccountCard({ account, onVerify, onReconnect, onDelete }: AccountCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name = account.displayName || account.email || account.id;
  const bg = nameToColor(name);
  const active = account.isActive || account.status === 'active';
  const rl = account.rateLimits ?? {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.015 }}
      className="rounded-2xl p-5 flex flex-col gap-4 relative"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 relative"
          style={{ backgroundColor: bg }}
        >
          {getInitials(name)}
          {/* Status dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{
              backgroundColor: active ? 'var(--success)' : 'var(--danger)',
              borderColor: 'var(--bg-elevated)',
              animation: active ? 'status-pulse 2s infinite' : 'none',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
          {account.email && (
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{account.email}</p>
          )}
          <span
            className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded mt-1"
            style={{
              backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: active ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {active ? 'Active' : 'Expired'}
          </span>
        </div>
        {/* Kebab menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-muted)' }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-50 rounded-xl py-1 w-44 shadow-2xl"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => { navigator.clipboard.writeText(account.id); setMenuOpen(false); }}
              >
                <Copy size={14} /> Copy ID
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10 transition-colors"
                style={{ color: 'var(--danger)' }}
                onClick={() => { onDelete?.(account.id); setMenuOpen(false); }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rate limit bars */}
      {Object.keys(rl).length > 0 && (
        <div className="flex flex-col gap-2">
          {Object.entries(rl).map(([key, val]) => (
            <RateLimitBar key={key} label={key} current={val.current} limit={val.limit} />
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-2 mt-auto">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Shield size={13} />}
          onClick={() => onVerify?.(account.id)}
          className="flex-1"
        >
          Verify
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw size={13} />}
          onClick={() => onReconnect?.(account.id)}
          className="flex-1"
        >
          Reconnect
        </Button>
      </div>
    </motion.div>
  );
}
