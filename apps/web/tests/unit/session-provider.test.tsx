import {
  type ClientSession,
  SessionProvider,
  useAuth,
  useSession,
  useUser,
} from '@/components/session-provider';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

const sampleSession: ClientSession = {
  user: {
    id: 'user-1',
    email: 'a@b.com',
    name: 'Alice',
    image: null,
    isDemo: false,
    preferredLocale: 'es',
    timezone: 'UTC',
  },
};

function wrap(value: ClientSession | null) {
  return ({ children }: { children: ReactNode }) => (
    <SessionProvider value={value}>{children}</SessionProvider>
  );
}

describe('SessionProvider hooks', () => {
  it('useSession returns null when no provider', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current).toBeNull();
  });

  it('useSession returns the value when provided', () => {
    const { result } = renderHook(() => useSession(), { wrapper: wrap(sampleSession) });
    expect(result.current).toEqual(sampleSession);
  });

  it('useUser returns user object or null', () => {
    const { result: r1 } = renderHook(() => useUser(), { wrapper: wrap(sampleSession) });
    expect(r1.current?.id).toBe('user-1');
    const { result: r2 } = renderHook(() => useUser(), { wrapper: wrap(null) });
    expect(r2.current).toBeNull();
  });

  it('useAuth reports authentication state', () => {
    const { result: r1 } = renderHook(() => useAuth(), { wrapper: wrap(sampleSession) });
    expect(r1.current).toEqual({ isAuthenticated: true, isDemo: false, userId: 'user-1' });
    const { result: r2 } = renderHook(() => useAuth(), { wrapper: wrap(null) });
    expect(r2.current).toEqual({ isAuthenticated: false, isDemo: false, userId: null });
  });

  it('useAuth reports demo users', () => {
    const demo: ClientSession = {
      user: { ...sampleSession.user, isDemo: true },
    };
    const { result } = renderHook(() => useAuth(), { wrapper: wrap(demo) });
    expect(result.current.isDemo).toBe(true);
  });
});
