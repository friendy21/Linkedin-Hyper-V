// FILE: components/inbox/ReplyInput.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Spinner } from '@/components/ui/Button';

interface ReplyInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

const MAX_CHARS = 300;

export function ReplyInput({ onSend, disabled }: ReplyInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const maxLines = 6;
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxLines)}px`;
  }, []);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    setText((e.target as HTMLTextAreaElement).value);
    adjustHeight();
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const hasText = text.trim().length > 0;
  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div
      className="flex items-end gap-2 p-3"
      style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}
    >
      <div
        className="flex-1 flex items-end gap-2 px-3 py-2 rounded-xl"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: `1px solid ${overLimit ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'}`,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onInput={handleInput}
          onChange={() => {}} // controlled via onInput
          onKeyDown={handleKeyDown}
          disabled={sending || disabled}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 text-sm resize-none outline-none bg-transparent leading-5"
          style={{
            color: 'var(--text-primary)',
            overflow: 'hidden',
            minHeight: 20,
          }}
        />
        {charCount > 200 && (
          <span
            className="text-[10px] flex-shrink-0 self-end pb-0.5"
            style={{ color: overLimit ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {charCount}/{MAX_CHARS}
          </span>
        )}
      </div>

      <button
        id="reply-send-btn"
        onClick={handleSend}
        disabled={!hasText || sending || disabled || overLimit}
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: hasText && !overLimit ? 'var(--accent)' : 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          color: hasText && !overLimit ? 'white' : 'var(--text-muted)',
        }}
      >
        {sending ? <Spinner size={14} /> : <Send size={15} />}
      </button>
    </div>
  );
}
