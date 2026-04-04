// FILE: components/inbox/MessageThread.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, ArrowDown } from 'lucide-react';
import { MessageThreadSkeleton } from '@/components/ui/SkeletonLoader';
import { useWebSocket } from '@/components/providers/WebSocketProvider';

interface Message {
  id: string;
  text: string;
  sentAt: string;
  isSentByMe: boolean;
  senderName?: string;
  senderId?: string;
}

interface MessageGroup {
  isSentByMe: boolean;
  senderName?: string;
  messages: Message[];
  groupTime: string;
}

interface NewMessageData {
  conversationId: string;
  linkedInAccountId: string;
  participantName?: string;
  message?: {
    id: string;
    text: string;
    sentAt: string;
    isSentByMe: boolean;
  };
}

interface MessageThreadProps {
  conversationId: string;
  accountId: string;
  participantName: string;
  participantProfileUrl?: string | null;
}

function nameToColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatDaySeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.isSentByMe === msg.isSentByMe) {
      last.messages.push(msg);
      last.groupTime = msg.sentAt;
    } else {
      groups.push({
        isSentByMe: msg.isSentByMe,
        senderName: msg.senderName,
        messages: [msg],
        groupTime: msg.sentAt,
      });
    }
  }
  return groups;
}

export function MessageThread({
  conversationId,
  accountId,
  participantName,
  participantProfileUrl,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { socket } = useWebSocket();

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/thread?accountId=${accountId}&chatId=${conversationId}`);
      if (res.ok) {
        const data: unknown = await res.json();
        const msgs = Array.isArray(data)
          ? data as Message[]
          : (typeof data === 'object' && data !== null && 'messages' in data)
          ? (data as { messages: Message[] }).messages
          : [];
        setMessages(msgs);
      }
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [accountId, conversationId, scrollToBottom]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  // Subscribe to new messages via socket
  useEffect(() => {
    if (!socket) return;

    const handler = (data: NewMessageData) => {
      if (data.conversationId !== conversationId) return;
      if (data.message) {
        setMessages(prev => [...prev, {
          id: data.message!.id,
          text: data.message!.text,
          sentAt: data.message!.sentAt,
          isSentByMe: data.message!.isSentByMe,
        }]);
        requestAnimationFrame(() => scrollToBottom(true));
      } else {
        // fetch fresh if we have no payload
        fetchThread();
      }
    };

    socket.on('inbox:new_message', handler);
    return () => { socket.off('inbox:new_message', handler); };
  }, [socket, conversationId, scrollToBottom, fetchThread]);

  // Detect scroll position for "new message" button
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!atBottom);
  };

  const groups = groupMessages(messages);
  const avatarBg = nameToColor(participantName);

  return (
    <div className="flex flex-col h-full relative">
      {/* Thread header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: avatarBg }}
        >
          {getInitials(participantName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{participantName}</p>
        </div>
        {participantProfileUrl && (
          <a
            href={participantProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-muted)' }}
          >
            <ExternalLink size={15} />
          </a>
        )}
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        onScroll={handleScroll}
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        {loading ? (
          <MessageThreadSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet. Say hello!</p>
          </div>
        ) : (
          <>
            {groups.map((group, gi) => {
              const prevGroup = groups[gi - 1];
              const showDaySep = !prevGroup || !isSameDay(prevGroup.groupTime, group.messages[0].sentAt);
              return (
                <div key={gi}>
                  {showDaySep && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                      <span
                        className="text-[10px] px-2 sticky top-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatDaySeparator(group.messages[0].sentAt)}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    </div>
                  )}
                  <div className={`flex gap-2 mb-3 ${group.isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!group.isSentByMe && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-auto"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {getInitials(participantName)}
                      </div>
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[72%] ${group.isSentByMe ? 'items-end' : 'items-start'}`}>
                      {group.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="px-3.5 py-2.5 text-sm leading-relaxed"
                          style={{
                            backgroundColor: group.isSentByMe ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            borderRadius: group.isSentByMe ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.text}
                        </div>
                      ))}
                      <span className="text-[10px] mt-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(group.groupTime)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && !loading && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-4 p-2 rounded-full shadow-lg transition-colors"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: '1px solid rgba(99,102,241,0.4)',
          }}
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
}

// Expose setMessages for parent to call (optimistic append)
export type { Message };
