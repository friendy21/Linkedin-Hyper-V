// FILE: components/connections/ConnectionGrid.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, MessageSquare, Search, X, UserPlus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { toast } from '@/components/ui/Toast';

interface Connection {
  id: string;
  name: string;
  headline?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  linkedInAccountId: string;
  accountDisplayName?: string;
}

interface SearchResult {
  id: string;
  name: string;
  headline?: string | null;
  profileUrl?: string | null;
}

interface Account {
  id: string;
  displayName?: string;
}

interface ConnectionGridProps {
  connections: Connection[];
  accounts?: Account[];
  loading?: boolean;
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

// ── Find & Connect Modal ────────────────────────────────────────────────────
function FindConnectModal({
  accounts,
  onClose,
}: {
  accounts: Account[];
  onClose: () => void;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)[0];
  const timerRef = { current: debounceRef };

  const search = useCallback(
    async (q: string, accountId: string) => {
      if (!q.trim()) { setResults([]); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/people/search?accountId=${accountId}&query=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data: unknown = await res.json();
          setResults(Array.isArray(data) ? data as SearchResult[] : []);
        }
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(e.target.value, selectedAccountId), 400);
  };

  const handleConnect = async (person: SearchResult) => {
    setConnectingId(person.id);
    try {
      const res = await fetch('/api/connections/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, profileUrl: person.profileUrl, note }),
      });
      if (res.ok) {
        toast.success(`Connection request sent to ${person.name}`);
        setNoteFor(null);
        setNote('');
      } else {
        toast.error('Failed to send connection');
      }
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-5 shadow-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Find & Connect</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06]" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Account selector */}
        {accounts.length > 1 && (
          <div className="relative mb-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm pr-8 appearance-none outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.displayName || a.id}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* Search input */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search people by name…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {searching && <div className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Searching…</div>}
          {!searching && results.length === 0 && query && (
            <div className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No results found</div>
          )}
          {results.map(person => (
            <div key={person.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: nameToColor(person.name) }}>
                  {getInitials(person.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{person.name}</p>
                  {person.headline && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{person.headline}</p>}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={connectingId === person.id}
                  onClick={() => setNoteFor(person.id)}
                >
                  Connect
                </Button>
              </div>
              {noteFor === person.id && (
                <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 300))}
                    placeholder="Add a personal note (optional, max 300 chars)"
                    className="w-full px-3 py-2 rounded-lg text-xs resize-none outline-none mt-2"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{note.length}/300</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setNoteFor(null); setNote(''); }}>Cancel</Button>
                      <Button variant="primary" size="sm" loading={connectingId === person.id} onClick={() => handleConnect(person)}>Send</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Grid ────────────────────────────────────────────────────────────────
export function ConnectionGrid({ connections, accounts = [], loading = false }: ConnectionGridProps) {
  const [search, setSearch] = useState('');
  const [findModalOpen, setFindModalOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter(c => c.name.toLowerCase().includes(q));
  }, [connections, search]);

  const handleMessage = async (conn: Connection) => {
    try {
      const res = await fetch('/api/messages/send-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: conn.linkedInAccountId, profileUrl: conn.profileUrl, text: 'Hi!' }),
      });
      if (res.ok) toast.success(`Message sent to ${conn.name}`);
      else toast.error('Failed to send message');
    } catch (_) {
      toast.error('Network error');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={120} className="rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connections…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <Button
          id="find-connect-trigger"
          variant="primary"
          size="md"
          leftIcon={<UserPlus size={14} />}
          onClick={() => setFindModalOpen(true)}
        >
          Find & Connect
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <UserPlus size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No connections match your search' : 'No connections yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((conn, index) => (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
              whileHover={{ scale: 1.015 }}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: nameToColor(conn.name) }}
                >
                  {getInitials(conn.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{conn.name}</p>
                  {conn.headline && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{conn.headline}</p>}
                  {conn.accountDisplayName && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>
                      {conn.accountDisplayName}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button variant="secondary" size="sm" leftIcon={<MessageSquare size={12} />} onClick={() => handleMessage(conn)} className="flex-1">
                  Message
                </Button>
                {conn.profileUrl && (
                  <a
                    href={conn.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {findModalOpen && <FindConnectModal accounts={accounts} onClose={() => setFindModalOpen(false)} />}
    </div>
  );
}
