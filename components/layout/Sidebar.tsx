// FILE: components/layout/Sidebar.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mail,
  Users,
  Bell,
  UserCircle,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface NavCounts {
  inbox: number;
  connections: number;
  notifications: number;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count: number;
  countColor: string;
}

function nameToColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9','#ef4444','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [counts, setCounts] = useState<NavCounts>({ inbox: 0, connections: 0, notifications: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) setIsCollapsed(saved === 'true');
    } catch (_) {}
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try { localStorage.setItem('sidebar-collapsed', String(next)); } catch (_) {}
  };

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      if (!res.ok) return;
      const data = await res.json();
      const s = data.summary;
      setCounts({
        inbox: s.unreadMessages || 0,
        connections: s.pendingConnections || 0,
        notifications: s.recentNotifications || 0,
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    void fetchCounts();
    const id = setInterval(() => void fetchCounts(), 60_000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  const getUserInitials = () => {
    if (!user?.name) return 'LI';
    return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navItems: NavItem[] = [
    { href: '/',              icon: LayoutDashboard, label: 'Dashboard',      count: 0,                      countColor: '' },
    { href: '/inbox',         icon: Mail,            label: 'Inbox',          count: counts.inbox,           countColor: 'bg-rose-500' },
    { href: '/connections',   icon: Users,           label: 'Network',        count: counts.connections,     countColor: 'bg-indigo-500' },
    { href: '/notifications', icon: Bell,            label: 'Activity',       count: counts.notifications,   countColor: 'bg-amber-500' },
    { href: '/accounts',      icon: UserCircle,      label: 'Accounts',       count: 0,                      countColor: '' },
  ];

  const avatarBg = user?.name ? nameToColor(user.name) : '#6366f1';

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav
        className="hidden md:flex flex-col py-5 gap-2 flex-shrink-0 min-h-screen glass border-r z-50 relative overflow-hidden"
        style={{
          width: isCollapsed ? 64 : 240,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 mb-4 overflow-hidden">
          <Link href="/" className="flex items-center gap-3 min-w-0" title="Hyper-V">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base select-none flex-shrink-0"
              style={{ backgroundColor: 'var(--linkedin)' }}
            >
              in
            </div>
            {!isCollapsed && (
              <span
                className="font-bold text-white whitespace-nowrap overflow-hidden"
                style={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}
              >
                Hyper-V
              </span>
            )}
          </Link>
        </div>

        {/* Nav links */}
        <div className="flex flex-col gap-1 flex-1 w-full px-2 overflow-hidden">
          {navItems.map(({ href, icon: Icon, label, count, countColor }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={[
                  'relative flex items-center gap-3 w-full py-2.5 px-3 rounded-xl transition-colors duration-150 group overflow-hidden',
                  active
                    ? 'border-l-4 text-white'
                    : 'text-[--text-secondary] hover:text-white hover:bg-white/[0.04] border-l-4 border-transparent',
                ].join(' ')}
                style={active ? {
                  borderLeftColor: 'var(--accent)',
                  backgroundColor: 'var(--accent-glow)',
                } : {}}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{label}</span>
                )}
                {count > 0 && (
                  <span
                    className={`absolute ${isCollapsed ? '-top-1 -right-1' : 'right-3'} ${countColor} text-white text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div
          className="flex flex-col gap-1 px-2 pt-3 mt-auto"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Collapse toggle */}
          <button
            onClick={toggleCollapse}
            className="flex items-center justify-center w-full py-2 rounded-xl text-[--text-muted] hover:text-white hover:bg-white/[0.04] transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3 px-1 py-2 overflow-hidden">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative"
              style={{ backgroundColor: avatarBg }}
            >
              {getUserInitials()}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 status-dot-active"
                style={{ backgroundColor: 'var(--success)', borderColor: 'var(--bg-base)' }}
              />
            </div>
            {!isCollapsed && user && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.name}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-[--text-muted] hover:text-[--danger] hover:bg-red-500/10 transition-colors group"
            title="Sign out"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">Sign out</span>}
          </button>
        </div>

        <ConfirmDialog
          open={isLogoutDialogOpen}
          onOpenChange={setIsLogoutDialogOpen}
          title="Sign out?"
          description="Are you sure you want to sign out of your account?"
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          confirmVariant="primary"
          onConfirm={logout}
        />
      </nav>

      {/* ── Mobile tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map(({ href, icon: Icon, label, count, countColor }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
                  active ? 'text-white' : 'text-[--text-secondary]'
                }`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{label}</span>
                {count > 0 && (
                  <span
                    className={`absolute -top-0.5 right-0 ${countColor} text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom spacer */}
      <div className="md:hidden h-16" />
    </>
  );
}
