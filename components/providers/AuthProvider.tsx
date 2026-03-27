// FILE: components/providers/AuthProvider.tsx
// Wraps child components with authentication context.
// Exposes isAuthenticated, userId, login, and logout.
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading:       boolean;
  userId:          string | null;
  login:           (password: string) => Promise<void>;
  logout:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verify');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUserId(data.userId || null);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback(async (password: string) => {
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    await checkAuth(); // re-verify to get userId
    router.push('/');
  }, [router, checkAuth]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setUserId(null);
    router.push('/login');
    toast.success('Logged out successfully');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
