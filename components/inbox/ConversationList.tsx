'use client';

import { memo } from 'react';
import type { Conversation, Account } from '@/types/dashboard';
import { Avatar } from '@/components/ui/Avatar';
import { UnreadBadge } from '@/components/ui/UnreadBadge';
import { AccountBadge } from '@/components/ui/AccountBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { formatRelativeTime } from '@/lib/time-utils';
import { Inbox, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  accounts: Account[];
  selected: Conversation | null;
  filter: string;
  search: string;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: string) => void;
  onSelect: (conv: Conversation) => void;
}

export const ConversationList = memo(function ConversationList({
  conversations,
  accounts,
  selected,
  filter,
  search,
  onSearchChange,
  onFilterChange,
  onSelect,
}: ConversationListProps) {
  const totalUnread = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0);
  const filterOptions = [
    { value: 'all', label: 'All', count: conversations.length },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.displayName || account.id,
      count: conversations.filter((conversation) => conversation.accountId === account.id).length,
    })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-panel)]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Messages</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            </p>
          </div>
          {totalUnread > 0 && <UnreadBadge count={totalUnread} color="blue" />}
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations"
            className="app-input h-9 pl-9 pr-3 text-sm"
          />
        </div>
        {accounts.length > 0 && <FilterBar options={filterOptions} value={filter} onChange={onFilterChange} className="mt-3" />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <EmptyState compact icon={<Inbox size={22} />} title="No messages found" description="Try a different search or account filter." />
        ) : (
          conversations.map((conversation) => {
            const isSelected = conversation.conversationId === selected?.conversationId;
            const timeString = formatRelativeTime(conversation.lastMessage.sentAt);
            const hasUnread = conversation.unreadCount > 0;

            return (
              <button
                key={conversation.conversationId}
                onClick={() => onSelect(conversation)}
                className={cn(
                  'mb-1.5 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-transparent bg-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]'
                )}
              >
                <div className="relative shrink-0">
                  <Avatar name={conversation.participant.name} size="md" />
                  {hasUnread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[var(--accent)]" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-sm text-[var(--text-primary)]', hasUnread ? 'font-bold' : 'font-semibold')}>
                      {conversation.participant.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{timeString}</span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <p className={cn('min-w-0 flex-1 truncate text-xs', hasUnread ? 'font-semibold text-[var(--text-secondary)]' : 'text-[var(--text-muted)]')}>
                      {conversation.lastMessage.sentByMe ? 'You: ' : ''}
                      {conversation.lastMessage.text}
                    </p>
                    {hasUnread && <UnreadBadge count={conversation.unreadCount} color="blue" />}
                  </div>

                  <div className="mt-2">
                    <AccountBadge name={conversation.accountId} />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});
