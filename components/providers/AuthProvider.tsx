// FILE: components/providers/AuthProvider.tsx
// Wraps child components with authentication context.
// Exposes isAuthenticated, user, login, and logout.
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Toast } from '@/components/ui/Toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading:       boolean;
  user:            User | null;
  userId:          string | null;
  login:           (email: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verify');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUserId(data.userId || null);
        // Fetch user details if we have a userId
        if (data.userId) {
          try {
            const userRes = await fetch('/api/user/me');
            if (userRes.ok) {
              const userData = await userRes.json();
              setUser(userData.user || null);
            }
          } catch {
            // User details fetch failed, but auth is still valid
          }
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUserId(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    checkAuth(); 
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    await checkAuth(); // re-verify to get user info
    router.push('/');
  }, [router, checkAuth]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setUser(null);
    setUserId(null);
    router.push('/login');
    toast.custom((t) => (
      <Toast type="success" title="Logged out" description="You have been signed out successfully" visible={t.visible} />
    ));
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
