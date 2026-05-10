// FILE: app/(dashboard)/layout.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingScreen } from '@/components/layout/LoadingScreen';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen bg-[var(--bg-base)] lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-x-hidden pb-16 pt-14 lg:h-screen lg:overflow-y-auto lg:pb-0 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
