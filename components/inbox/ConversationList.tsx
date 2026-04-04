// FILE: components/inbox/ConversationList.tsx
'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { TimeAgo } from '@/components/ui/TimeAgo';
import { ConversationListSkeleton } from '@/components/ui/SkeletonLoader';

export interface Conversation {
  id: string;
  linkedInAccountId: string;
  participantName: string;
  participantProfileUrl?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  lastMessageSentByMe?: boolean;
  accountDisplayName?: string;
  unreadCount?: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
  accounts?: Array<{ id: string; displayName?: string }>;
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

function isRecent(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  loading,
  accounts = [],
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<string | 'all'>('all');

  const filtered = useMemo(() => {
    let list = conversations;
    if (accountFilter !== 'all') {
      list = list.filter(c => c.linkedInAccountId === accountFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.participantName.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, accountFilter, search]);

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border)' }}>
      {/* Search */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Account filter tabs */}
      {accounts.length > 1 && (
        <div
          className="flex gap-1 px-3 py-2 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {(['all', ...accounts.map(a => a.id)] as const).map((id) => {
            const label = id === 'all' ? 'All' : (accounts.find(a => a.id === id)?.displayName ?? id.slice(-4));
            const active = accountFilter === id;
            return (
              <button
                key={id}
                onClick={() => setAccountFilter(id)}
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-glow)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ConversationListSkeleton count={7} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations found</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId;
            const hasUnread = !conv.lastMessageSentByMe && isRecent(conv.lastMessageAt);
            const initials = getInitials(conv.participantName || '?');
            const avatarBg = nameToColor(conv.participantName || 'U');

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className="w-full flex items-start gap-3 px-3 py-3 text-left relative transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--accent-glow)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: avatarBg }}
                >
                  {initials}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {conv.participantName}
                    </span>
                    {conv.lastMessageAt && (
                      <TimeAgo timestamp={conv.lastMessageAt!} className="text-[10px] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {conv.lastMessageText || 'No messages yet'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {conv.accountDisplayName && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(99,102,241,0.12)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(99,102,241,0.2)',
                        }}
                      >
                        {conv.accountDisplayName}
                      </span>
                    )}
                    {hasUnread && (
                      <span
                        className="w-2 h-2 rounded-full ml-auto"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
