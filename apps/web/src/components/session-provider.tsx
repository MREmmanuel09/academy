'use client';

import { type ReactNode, createContext, useContext } from 'react';

export interface ClientSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    isDemo: boolean;
    preferredLocale: 'es' | 'en';
    timezone: string;
  };
}

const SessionContext = createContext<ClientSession | null>(null);

interface SessionProviderProps {
  value: ClientSession | null;
  children: ReactNode;
}

/**
 * Client-side session provider. Use it once at the root of a server
 * component tree where `auth()` is called server-side, then pass the
 * session down to client components via this provider.
 *
 * In Next.js App Router, the typical pattern is:
 *   1. Server component calls `auth()`.
 *   2. Server component wraps children in <SessionProvider value={session}>.
 *   3. Client components anywhere inside can call useSession().
 */
export function SessionProvider({ value, children }: SessionProviderProps) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession | null {
  return useContext(SessionContext);
}

export function useUser(): ClientSession['user'] | null {
  const s = useContext(SessionContext);
  return s?.user ?? null;
}

export function useAuth(): { isAuthenticated: boolean; isDemo: boolean; userId: string | null } {
  const s = useContext(SessionContext);
  return {
    isAuthenticated: Boolean(s?.user),
    isDemo: s?.user.isDemo ?? false,
    userId: s?.user.id ?? null,
  };
}
