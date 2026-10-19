// frontend/lib/auth.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, User } from './api';

type AuthState = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Routes that require a login
const PROTECTED_PREFIXES = ['/dashboard'];

// Routes that should redirect AWAY when logged in
const GUEST_ONLY = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Route guards
  useEffect(() => {
    if (loading) return;
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
    const isGuestOnly = GUEST_ONLY.includes(pathname);

    if (isProtected && !user) {
      router.replace('/login');
    } else if (isGuestOnly && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    setUser(null);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}