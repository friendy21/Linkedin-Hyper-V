'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, LayoutDashboard, Mail, UserCircle, Users } from 'lucide-react';
import { getAccounts, getUnifiedInbox, getAccountActivity } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface NavCounts {
  inbox: number;
  connections: number;
  notifications: number;
}

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', countKey: null },
  { href: '/inbox', icon: Mail, label: 'Inbox', countKey: 'inbox' },
  { href: '/connections', icon: Users, label: 'Network', countKey: 'connections' },
  { href: '/notifications', icon: Bell, label: 'Activity', countKey: 'notifications' },
  { href: '/accounts', icon: UserCircle, label: 'Accounts', countKey: null },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NavCounts>({ inbox: 0, connections: 0, notifications: 0 });
  const [activeAccounts, setActiveAccounts] = useState(0);

  async function fetchCounts() {
    try {
      const { accounts } = await getAccounts();
      setActiveAccounts(accounts.filter((account) => account.isActive).length);

      let inboxUnread = 0;
      try {
        const { conversations } = await getUnifiedInbox();
        inboxUnread = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0);
      } catch {
        // Counts are best-effort navigation hints.
      }

      let connections = 0;
      let notifications = 0;
      const activityResults = await Promise.allSettled(accounts.map((account) => getAccountActivity(account.id, 0, 200)));
      for (const result of activityResults) {
        if (result.status === 'fulfilled') {
          connections += result.value.entries.filter((entry) => entry.type === 'connectionSent').length;
          notifications += result.value.entries.length;
        }
      }

      setCounts({ inbox: inboxUnread, connections, notifications });
    } catch {
      // Keep the shell usable even when the backend is warming up.
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => void fetchCounts(), 0);
    const intervalId = setInterval(() => void fetchCounts(), 60_000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-panel)] lg:flex lg:h-screen lg:flex-col">
        <div className="border-b border-[var(--border)] px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-base font-bold text-white">
              in
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">LinkedIn Hyper-V</p>
              <p className="text-xs text-[var(--text-muted)]">Automation console</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, icon: Icon, label, countKey }) => {
            const active = isActivePath(pathname, href);
            const count = countKey ? counts[countKey] : 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px]', active ? 'bg-white/80' : 'bg-[var(--bg-subtle)]')}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <div className="rounded-lg bg-[var(--bg-subtle)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <BarChart3 size={14} />
              System status
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Active accounts</span>
              <span className="font-semibold text-[var(--text-primary)]">{activeAccounts}</span>
            </div>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold text-white">
            in
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Hyper-V</span>
        </Link>
        <div className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
          {activeAccounts} active
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-[var(--border)] bg-[var(--bg-panel)] lg:hidden">
        {navItems.map(({ href, icon: Icon, label, countKey }) => {
          const active = isActivePath(pathname, href);
          const count = countKey ? counts[countKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold',
                active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
              )}
            >
              <Icon size={19} />
              <span>{label === 'Dashboard' ? 'Home' : label}</span>
              {count > 0 && <span className="absolute right-4 top-2 h-2 w-2 rounded-full bg-[var(--accent)]" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
