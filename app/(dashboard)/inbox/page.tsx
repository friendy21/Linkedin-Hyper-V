'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Conversation, Account } from '@/types/dashboard';
import { getUnifiedInbox, getAccounts, getConversationThread } from '@/lib/api-client';
import { ConversationList } from '@/components/inbox/ConversationList';
import { MessageThread } from '@/components/inbox/MessageThread';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { wsClient } from '@/lib/websocket-client';
import { ExportButton } from '@/components/ui/ExportButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { cn } from '@/lib/utils';

type InboxUpdatedPayload = {
  conversations?: Conversation[];
};

type InboxNewMessagePayload = {
  chatId?: string;
};

type StatusChangedPayload = {
  status?: 'connected' | 'disconnected' | 'reconnecting';
};

export default function InboxPage() {
  const [accounts,      setAccounts]      = useState<Account[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected,      setSelected]      = useState<Conversation | null>(null);
  const [filter,        setFilter]        = useState<string>('all');
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [isLive,        setIsLive]        = useState(false);

  // B2 - Accounts are stable; fetch once on mount (5-min ISR cache in api-client).
  const loadAccounts = useCallback(async () => {
    try {
      const { accounts: accs } = await getAccounts();
      setAccounts(accs);
    } catch {
      // non-fatal - account list stays empty, filter pills just won't show
    }
  }, []);

  // B2 - Inbox is real-time; poll separately on its own interval.
  const loadInbox = useCallback(async () => {
    try {
      const inboxData = await getUnifiedInbox();
      setConversations(inboxData.conversations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts(); // once on mount
  }, [loadAccounts]);

  useEffect(() => {
    void loadInbox();
    
    // Set up WebSocket listeners for real-time updates
    const unsubscribeInboxUpdate = wsClient.on('inbox:updated', (data: InboxUpdatedPayload) => {
      console.log('[Inbox] Real-time update received:', data);
      if (data.conversations) {
        setConversations(data.conversations);
      } else {
        // Refresh if update doesn't include full data
        void loadInbox();
      }
    });

    const unsubscribeNewMessage = wsClient.on('inbox:new_message', (data: InboxNewMessagePayload) => {
      console.log('[Inbox] New message received:', data);
      // Refresh the current thread if it's the one receiving the message
      if (selected && data.chatId === selected.conversationId) {
        void handleSelect(selected);
      } else {
        // Refresh inbox to update last message preview
        void loadInbox();
      }
    });

    const unsubscribeStatus = wsClient.on('status:changed', (data: StatusChangedPayload) => {
      setIsLive(data.status === 'connected');
    });

    // Set initial status
    setIsLive(wsClient.isConnected);

    return () => {
      unsubscribeInboxUpdate();
      unsubscribeNewMessage();
      unsubscribeStatus();
    };
  }, [loadInbox, selected]);

  const filtered =
    (filter === 'all'
      ? conversations
      : conversations.filter((c) => c.accountId === filter))
      .filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          c.participant.name.toLowerCase().includes(q) ||
          c.lastMessage.text.toLowerCase().includes(q) ||
          c.accountId.toLowerCase().includes(q)
        );
      });

  useEffect(() => {
    if (!isLive || accounts.length === 0) return;

    const ids = Array.from(new Set(accounts.map((a) => String(a.id || '').trim()).filter(Boolean)));
    ids.forEach((id) => wsClient.joinAccountRoom(id));

    return () => {
      ids.forEach((id) => wsClient.leaveAccountRoom(id));
    };
  }, [accounts, isLive]);

  async function handleSelect(conv: Conversation) {
    setSelected(conv); // immediate optimistic UI update
    try {
      const thread = await getConversationThread(conv.accountId, conv.conversationId);
      const fallbackMessages = Array.isArray(conv.messages) ? conv.messages : [];
      const hasThreadMessages = Array.isArray(thread.messages) && thread.messages.length > 0;
      setSelected({
        ...conv,
        messages: hasThreadMessages ? thread.messages : fallbackMessages,
      });
    } catch {
      // ignore - thread shows with previous messages or empty
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Fetching messages from all accounts...
        </p>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadInbox} />;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem-4rem)] min-h-[640px] flex-col lg:h-screen lg:min-h-0">
      <PageHeader
        title="Inbox"
        description="Unified conversations across every configured LinkedIn account."
        actions={
          <>
            <StatusPill tone={isLive ? 'success' : 'neutral'} dot>{isLive ? 'Live' : 'Offline'}</StatusPill>
          <ExportButton 
            type="messages" 
            accountId={filter !== 'all' ? filter : undefined}
            label="Export"
            size="sm"
          />
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-hidden border-t border-[var(--border)] lg:border-t-0">
        <div className="h-full lg:grid lg:grid-cols-[390px_minmax(0,1fr)]">
          <div className={cn('h-full min-h-0 border-r border-[var(--border)] lg:block', selected && 'hidden lg:block')}>
            <ConversationList
              conversations={filtered}
              accounts={accounts}
              selected={selected}
              filter={filter}
              search={search}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              onSelect={handleSelect}
            />
          </div>
          <div className={cn('h-full min-h-0 lg:block', !selected && 'hidden lg:block')}>
            <MessageThread
              conversation={selected}
              onBack={() => setSelected(null)}
              onMessageSent={(updatedConv) => {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.conversationId === updatedConv.conversationId ? updatedConv : c
                  )
                );
                setSelected(updatedConv);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
