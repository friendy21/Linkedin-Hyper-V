// FILE: app/(dashboard)/inbox/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationList, Conversation } from '@/components/inbox/ConversationList';
import { MessageThread } from '@/components/inbox/MessageThread';
import { ReplyInput } from '@/components/inbox/ReplyInput';
import { ChevronLeft, Users, ExternalLink } from 'lucide-react';
import { useWebSocket } from '@/components/providers/WebSocketProvider';
import { toast } from '@/components/ui/Toast';

interface Account {
  id: string;
  displayName?: string;
}

interface InboxUpdateData {
  linkedInAccountId: string;
}

interface NewMessageData {
  conversationId: string;
  linkedInAccountId: string;
  participantName?: string;
  lastMessageText?: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileThread, setIsMobileThread] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const { socket } = useWebSocket();
  const convRef = useRef(conversations);
  convRef.current = conversations;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/unified');
      if (!res.ok) return;
      const data: unknown = await res.json();
      const items = Array.isArray(data)
        ? data as Conversation[]
        : (typeof data === 'object' && data !== null && 'conversations' in data)
        ? (data as { conversations: Conversation[] }).conversations
        : [];
      setConversations(items);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/linkedin-accounts');
      if (!res.ok) return;
      const data: unknown = await res.json();
      if (typeof data === 'object' && data !== null && 'accounts' in data) {
        setAccounts((data as { accounts: Account[] }).accounts || []);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchAccounts();
  }, [fetchConversations, fetchAccounts]);

  // Socket subscriptions for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleInboxUpdated = (_data: InboxUpdateData) => {
      fetchConversations();
    };

    const handleNewMessage = (data: NewMessageData) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === data.conversationId);
        if (idx === -1) {
          // New conversation — fetch to get full data
          fetchConversations();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessageText: data.lastMessageText ?? updated[idx].lastMessageText,
          lastMessageAt: new Date().toISOString(),
          lastMessageSentByMe: false,
        };
        // re-sort by lastMessageAt
        updated.sort((a, b) =>
          new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
        );
        return updated;
      });
    };

    socket.on('inbox:updated', handleInboxUpdated);
    socket.on('inbox:new_message', handleNewMessage);
    return () => {
      socket.off('inbox:updated', handleInboxUpdated);
      socket.off('inbox:new_message', handleNewMessage);
    };
  }, [socket, fetchConversations]);

  const handleSend = async (text: string) => {
    if (!activeConv) return;
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeConv.linkedInAccountId,
          chatId: activeConv.id,
          text,
        }),
      });
      if (!res.ok) {
        const body: unknown = await res.json();
        const msg = typeof body === 'object' && body !== null && 'error' in body
          ? String((body as Record<string, unknown>).error)
          : 'Failed to send message';
        throw new Error(msg);
      }
      // update last msg optimistically
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === activeConv.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessageText: text, lastMessageAt: new Date().toISOString(), lastMessageSentByMe: true };
        return updated;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
      throw err;
    }
  };

  const nameToColor = (name: string) => {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  };
  const getInitials = (n: string) => n.split(' ').map(c => c[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>

      {/* ── Col 1: Conversation list ── */}
      <div
        className={`flex-shrink-0 h-full overflow-hidden ${isMobileThread ? 'hidden md:flex' : 'flex'} flex-col`}
        style={{ width: '18rem', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            activeId={activeConv?.id ?? null}
            onSelect={(conv) => {
              setActiveConv(conv);
              setIsMobileThread(true);
              setContactPanelOpen(false);
            }}
            loading={loading}
            accounts={accounts}
          />
        </div>
      </div>

      {/* ── Col 2: Thread ── */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden ${!isMobileThread ? 'hidden md:flex' : 'flex'}`}
      >
        {activeConv ? (
          <>
            {/* Mobile back header */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setIsMobileThread(false)} className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]" style={{ color: 'var(--text-muted)' }}>
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{activeConv.participantName}</span>
              <button
                className="ml-auto p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setContactPanelOpen(!contactPanelOpen)}
              >
                <Users size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <MessageThread
                conversationId={activeConv.id}
                accountId={activeConv.linkedInAccountId}
                participantName={activeConv.participantName}
                participantProfileUrl={activeConv.participantProfileUrl}
              />
              <ReplyInput onSend={handleSend} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-glow)' }}>
              <Users size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* ── Col 3: Contact panel ── */}
      {activeConv && (
        <div
          className={`flex-shrink-0 h-full overflow-y-auto transition-all duration-200 ${contactPanelOpen ? 'w-56' : 'w-0 overflow-hidden'} hidden md:block`}
          style={{ borderLeft: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}
        >
          {contactPanelOpen && (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 pt-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: nameToColor(activeConv.participantName) }}
                >
                  {getInitials(activeConv.participantName)}
                </div>
                <p className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>{activeConv.participantName}</p>
                {activeConv.accountDisplayName && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}
                  >
                    {activeConv.accountDisplayName}
                  </span>
                )}
              </div>
              {activeConv.participantProfileUrl && (
                <a
                  href={activeConv.participantProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  <ExternalLink size={13} />
                  View on LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop contact panel toggle button */}
      {activeConv && (
        <button
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-6 h-10 items-center justify-center rounded-l-lg transition-colors z-10"
          style={{
            right: contactPanelOpen ? '14rem' : 0,
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            transition: 'right 0.2s ease',
          }}
          onClick={() => setContactPanelOpen(!contactPanelOpen)}
        >
          <Users size={12} />
        </button>
      )}
    </div>
  );
}
