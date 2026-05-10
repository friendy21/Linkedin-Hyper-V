'use client';

import { useRef, useEffect, useState } from 'react';
import type { Conversation, Message } from '@/types/dashboard';
import { Avatar } from '@/components/ui/Avatar';
import { AccountBadge } from '@/components/ui/AccountBadge';
import { ReplyInput } from '@/components/inbox/ReplyInput';
import { sendMessage } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/time-utils';
import { ArrowLeft, CheckCheck, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageThreadProps {
  conversation: Conversation | null;
  onMessageSent: (updated: Conversation) => void;
  onBack?: () => void;
}

export function MessageThread({ conversation, onMessageSent, onBack }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages, autoScroll]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg-panel)]">
        <div className="animate-fade-in px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <MessageSquare size={28} />
          </div>
          <p className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
            Select a conversation
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Choose from the left panel to start messaging
          </p>
        </div>
      </div>
    );
  }

  const activeConversation: Conversation = conversation;
  const { participant, accountId, messages } = activeConversation;

  async function handleSend(text: string) {
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      text,
      sentAt: Date.now(),
      sentByMe: true,
      senderName: accountId,
    };

    const updatedConversation: Conversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, optimistic],
      lastMessage: { text, sentAt: Date.now(), sentByMe: true },
    };

    onMessageSent(updatedConversation);

    try {
      await sendMessage(accountId, activeConversation.conversationId, text);
    } catch (error) {
      const withoutOptimistic = updatedConversation.messages.filter((m) => m.id !== optimistic.id);
      const fallbackLast = withoutOptimistic[withoutOptimistic.length - 1];

      onMessageSent({
        ...updatedConversation,
        messages: withoutOptimistic,
        lastMessage: fallbackLast
          ? {
              text: fallbackLast.text,
              sentAt: fallbackLast.sentAt,
              sentByMe: fallbackLast.sentByMe,
            }
          : activeConversation.lastMessage,
      });

      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    }
  }

  const groupedMessages = groupConsecutiveMessages(messages);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--bg-panel)]">
      <div
        className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 sm:px-5"
      >
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] lg:hidden" aria-label="Back to conversations">
              <ArrowLeft size={18} />
            </button>
          )}
          <Avatar name={participant.name} size="md" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
              {participant.name}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>
        <AccountBadge name={accountId} />
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-base)] px-4 py-5 sm:px-6"
      >
        {groupedMessages.map((group, groupIndex) => (
          <MessageGroup
            key={groupIndex}
            messages={group.messages}
            isSentByMe={group.isSentByMe}
            senderName={group.senderName}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-24 right-5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--accent-hover)]"
        >
          Jump to latest
        </button>
      )}

      <ReplyInput onSend={handleSend} />
    </div>
  );
}

function groupConsecutiveMessages(
  messages: Message[]
): Array<{ messages: Message[]; isSentByMe: boolean; senderName: string }> {
  const groups: Array<{ messages: Message[]; isSentByMe: boolean; senderName: string }> = [];

  messages.forEach((message) => {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      lastGroup.isSentByMe === message.sentByMe &&
      lastGroup.senderName === message.senderName
    ) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        messages: [message],
        isSentByMe: message.sentByMe,
        senderName: message.senderName,
      });
    }
  });

  return groups;
}

function MessageGroup({
  messages,
  isSentByMe,
  senderName,
}: {
  messages: Message[];
  isSentByMe: boolean;
  senderName: string;
}) {
  return (
    <div className={`mb-6 flex gap-3 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0">
        <Avatar name={senderName} size="sm" />
      </div>

      <div className={`flex max-w-[82%] flex-col gap-1.5 sm:max-w-[72%] ${isSentByMe ? 'items-end' : 'items-start'}`}>
        <span className="mb-1 px-2 text-xs font-medium text-[var(--text-muted)]">
          {senderName}
        </span>

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isSentByMe={isSentByMe}
            isLast={index === messages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isSentByMe,
  isLast,
}: {
  message: Message;
  isSentByMe: boolean;
  isLast: boolean;
}) {
  const { text, sentAt } = message;

  return (
    <div className="w-full animate-fade-in">
      <div
        className={`inline-block px-4 py-3 text-sm leading-relaxed shadow-sm transition-all ${
          isSentByMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
        }`}
        style={{
          background: isSentByMe ? 'var(--accent)' : 'var(--bg-panel)',
          color: isSentByMe ? '#ffffff' : 'var(--text-primary)',
          maxWidth: '100%',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>

      {isLast && (
        <div className={`flex items-center gap-1 mt-1 px-2 ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-[var(--text-muted)]">
            {formatRelativeTime(sentAt)}
          </span>
          {isSentByMe && <CheckCheck size={14} className="text-[var(--accent)]" />}
        </div>
      )}
    </div>
  );
}
