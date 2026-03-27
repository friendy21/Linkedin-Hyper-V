'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Users, Bell, UserCircle } from 'lucide-react';
import { getAccounts, getUnifiedInbox, getAccountActivity } from '@/lib/api-client';
import { motion } from 'framer-motion';

interface NavCounts {
  inbox: number;
  connections: number;
  notifications: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NavCounts>({
    inbox: 0,
    connections: 0,
    notifications: 0,
  });

  async function fetchCounts() {
    try {
      const { accounts } = await getAccounts();

      let inboxUnread = 0;
      try {
        const { conversations } = await getUnifiedInbox();
        inboxUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      } catch {
        // intentionally swallowed
      }

      let connections  = 0;
      let notifications = 0;
      const activityResults = await Promise.allSettled(
        accounts.map((a) => getAccountActivity(a.id, 0, 200))
      );
      for (const r of activityResults) {
        if (r.status === 'fulfilled') {
          connections   += r.value.entries.filter((e) => e.type === 'connectionSent').length;
          notifications += r.value.entries.length;
        }
      }

      setCounts({ inbox: inboxUnread, connections, notifications });
    } catch {
      // silently fail — badges stay at 0
    }
  }

  useEffect(() => {
    void fetchCounts();
    const id = setInterval(() => void fetchCounts(), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navItems = [
    { href: '/inbox',         icon: Mail,       label: 'Inbox',    count: counts.inbox,         countColor: 'bg-rose-500' },
    { href: '/connections',   icon: Users,      label: 'Network',  count: counts.connections,   countColor: 'bg-indigo-500' },
    { href: '/notifications', icon: Bell,       label: 'Activity', count: counts.notifications, countColor: 'bg-rose-500' },
    { href: '/accounts',      icon: UserCircle, label: 'Accounts', count: 0,                    countColor: 'bg-blue-500' },
  ];

  return (
    <motion.nav
      initial={{ x: -64, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center py-6 gap-4 flex-shrink-0 w-[72px] min-h-screen glass-panel border-r border-slate-800 z-50 relative"
    >
      {/* LinkedIn brand logo */}
      <motion.div 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mb-6 flex-shrink-0"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg select-none bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
          in
        </div>
      </motion.div>

      {/* Nav links */}
      <div className="flex flex-col gap-3 flex-1 w-full px-3">
        {navItems.map(({ href, icon: Icon, label, count, countColor }, index) => {
          const isActive = pathname.startsWith(href);
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link
                href={href}
                title={label}
                className={`relative flex items-center justify-center w-full aspect-square rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'text-indigo-400 bg-indigo-500/15 shadow-[inset_3px_0_0_0_rgba(99,102,241,1)]' 
                    : 'text-slate-400 hover:text-slate-200 glass-nav-item'
                }`}
              >
                <Icon size={22} className={isActive ? 'text-glow' : 'group-hover:scale-110 transition-transform'} />
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1 -right-1 ${countColor} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md shadow-black/20`}
                  >
                    {count > 99 ? '99+' : count}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom: purple avatar */}
      <div className="mt-auto mb-4 flex flex-col items-center gap-1">
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className="relative cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-900 shadow-lg shadow-indigo-500/20 ring-2 ring-slate-800">
            LI
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        </motion.div>
      </div>
    </motion.nav>
  );
}
