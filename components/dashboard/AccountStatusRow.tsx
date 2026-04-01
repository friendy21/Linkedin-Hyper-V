// FILE: components/dashboard/AccountStatusRow.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import type { Account } from '@/types/dashboard';

interface AccountStatusRowProps {
  accounts: Account[];
  onAccountClick?: (accountId: string) => void;
}

// SVG Status dots with proper animations
function StatusDot({ status }: { status: 'active' | 'warning' | 'error' }) {
  const colors = {
    active: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-danger)',
  };

  return (
    <span
      className={`w-2.5 h-2.5 rounded-full ${status === 'active' ? 'status-dot-active' : ''}`}
      style={{ 
        backgroundColor: colors[status],
        boxShadow: status === 'active' ? `0 0 8px ${colors[status]}` : 'none',
      }}
    />
  );
}

function getAccountStatus(account: Account): { status: 'active' | 'warning' | 'error'; tooltip: string } {
  if (account.isActive) {
    return { 
      status: 'active', 
      tooltip: `Active • Last seen: ${account.lastSeen ? new Date(account.lastSeen).toLocaleString() : 'Unknown'}` 
    };
  }
  if (account.lastSeen) {
    const lastSeen = new Date(account.lastSeen);
    const hoursSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return { 
        status: 'warning', 
        tooltip: `Warning • Last seen: ${lastSeen.toLocaleString()}` 
      };
    }
  }
  return { 
    status: 'error', 
    tooltip: `Inactive • No recent activity` 
  };
}

function formatExpiryCountdown(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = expiry - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `Expires in ${days}d ${hours}h`;
  }
  return `Expires in ${hours}h`;
}

export function AccountStatusRow({ accounts, onAccountClick }: AccountStatusRowProps) {
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);

  // Empty state
  if (accounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border p-8 text-center"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        <div 
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--color-linkedin)' }}
        >
          <span className="text-white text-2xl font-bold">in</span>
        </div>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No LinkedIn accounts connected
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Connect your first account to start automating outreach and tracking activity.
        </p>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-linkedin)' }}
        >
          <Plus size={16} />
          Connect Account
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Account Status
        </h3>
        <Link
          href="/accounts"
          className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          View All Accounts
          <ChevronRight size={14} />
        </Link>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {accounts.map((account, index) => {
          const { status, tooltip } = getAccountStatus(account);
          const expiryText = formatExpiryCountdown(account.sessionExpiresAt);
          
          return (
            <motion.button
              key={account.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onAccountClick?.(account.id)}
              onMouseEnter={() => setHoveredAccount(account.id)}
              onMouseLeave={() => setHoveredAccount(null)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:border-[var(--brand-blue)]/30"
              style={{ 
                background: 'var(--bg-panel)', 
                borderColor: hoveredAccount === account.id ? 'var(--brand-blue)' : 'var(--border)',
              }}
              title={tooltip}
            >
              <StatusDot status={status} />
              <span 
                className="text-sm font-medium max-w-[150px] truncate" 
                style={{ color: 'var(--text-primary)' }}
                title={account.displayName || account.id}
              >
                {account.displayName || account.linkedinProfileId || account.id.slice(0, 8)}
              </span>
              
              {/* Expiry badge */}
              {status === 'active' && expiryText && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ 
                    background: 'var(--color-warning-bg)', 
                    color: 'var(--color-warning)' 
                  }}
                >
                  {expiryText}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
