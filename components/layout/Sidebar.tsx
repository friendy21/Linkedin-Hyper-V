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
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [counts, setCounts] = useState<NavCounts>({
    inbox: 0,
    connections: 0,
    notifications: 0,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Load collapse preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Save collapse preference
  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem('sidebar-collapsed', String(newValue));
  };

  // Fetch dashboard summary counts (single API call instead of N+1)
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      if (!res.ok) throw new Error('Failed to fetch summary');
      
      const data = await res.json();
      const summary = data.summary;
      
      setCounts({
        inbox: summary.unreadMessages || 0,
        connections: summary.pendingConnections || 0,
        notifications: summary.recentNotifications || 0,
      });
    } catch {
      // Silently fail - badges stay at 0
    }
  }, []);

  useEffect(() => {
    void fetchCounts();
    const id = setInterval(() => void fetchCounts(), 60_000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  // Get user initials
  const getUserInitials = () => {
    if (!user?.name) return 'LI';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fix active state - special handling for root path
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const navItems: NavItem[] = [
    { 
      href: '/', 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      count: 0, 
      countColor: '' 
    },
    { 
      href: '/inbox', 
      icon: Mail, 
      label: 'Inbox', 
      count: counts.inbox, 
      countColor: 'bg-rose-500' 
    },
    { 
      href: '/connections', 
      icon: Users, 
      label: 'Network', 
      count: counts.connections, 
      countColor: 'bg-indigo-500' 
    },
    { 
      href: '/notifications', 
      icon: Bell, 
      label: 'Activity', 
      count: counts.notifications, 
      countColor: 'bg-amber-500' 
    },
    { 
      href: '/accounts', 
      icon: UserCircle, 
      label: 'Accounts', 
      count: 0, 
      countColor: 'bg-blue-500' 
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <motion.nav
      initial={{ x: -64, opacity: 0 }}
      animate={{ 
        x: 0, 
        opacity: 1, 
        width: isCollapsed ? 72 : 220 
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="hidden md:flex flex-col py-6 gap-4 flex-shrink-0 min-h-screen glass-panel border-r border-slate-800 z-50 relative"
    >
      {/* LinkedIn brand logo */}
      <motion.div 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mb-6 flex-shrink-0 px-3"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg select-none bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 flex-shrink-0">
            in
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-semibold text-white whitespace-nowrap"
            >
              Hyper-V
            </motion.span>
          )}
        </Link>
      </motion.div>

      {/* Nav links */}
      <div className="flex flex-col gap-2 flex-1 w-full px-3">
        {navItems.map(({ href, icon: Icon, label, count, countColor }, index) => {
          const active = isActive(href);
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={href}
                title={label}
                className={`relative flex items-center gap-3 w-full py-3 px-3 rounded-xl transition-all duration-300 group ${
                  active 
                    ? 'text-indigo-400 bg-indigo-500/15 shadow-[inset_3px_0_0_0_rgba(99,102,241,1)]' 
                    : 'text-slate-400 hover:text-slate-200 glass-nav-item'
                }`}
              >
                <Icon size={22} className={`flex-shrink-0 ${active ? 'text-glow' : 'group-hover:scale-110 transition-transform'}`} />
                {!isCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap">{label}</span>
                )}
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute ${isCollapsed ? '-top-1 -right-1' : 'right-3'} ${countColor} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md shadow-black/20`}
                  >
                    {count > 99 ? '99+' : count}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom: Logout button and User avatar */}
      <div className="mt-auto flex flex-col gap-2 px-3">
        {/* Logout button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsLogoutDialogOpen(true)}
          className="flex items-center gap-3 py-3 px-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group"
          title="Sign out"
        >
          <LogOut size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          {!isCollapsed && (
            <span className="font-medium text-sm whitespace-nowrap">Sign out</span>
          )}
        </motion.button>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* User avatar */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="relative cursor-pointer flex items-center gap-3 py-2"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-900 shadow-lg shadow-indigo-500/20 ring-2 ring-slate-800 flex-shrink-0">
            {getUserInitials()}
          </div>
          {!isCollapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        </motion.div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        title="Sign out?"
        description="Are you sure you want to sign out of your account?"
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        confirmVariant="primary"
        onConfirm={handleLogout}
      />
    </motion.nav>
  );

  // Mobile Header
  const MobileHeader = () => (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-panel border-b border-slate-800">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm bg-gradient-to-br from-blue-500 to-blue-700">
            in
          </div>
          <span className="font-semibold text-white">Hyper-V</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-800"
          >
            <div className="p-4 space-y-2">
              {navItems.map(({ href, icon: Icon, label, count, countColor }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all ${
                      active 
                        ? 'text-indigo-400 bg-indigo-500/15' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{label}</span>
                    </div>
                    {count > 0 && (
                      <span className={`${countColor} text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1`}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                );
              })}
              
              {/* Mobile: User info and logout */}
              <div className="pt-4 mt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-violet-500 to-indigo-900">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsLogoutDialogOpen(true);
                  }}
                  className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileHeader />
      {/* Spacer for mobile header */}
      <div className="md:hidden h-14" />
    </>
  );
}
