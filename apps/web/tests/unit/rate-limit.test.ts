import { RATE_LIMITS, checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  it('allows first attempt', () => {
    const result = checkRateLimit('login', 'user@example.com');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.login.maxAttempts - 1);
  });

  it('blocks after max attempts', () => {
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      checkRateLimit('login', 'attacker@evil.com');
    }
    const result = checkRateLimit('login', 'attacker@evil.com');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after window expires', () => {
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      checkRateLimit('login', 'user@test.com');
    }
    const blocked = checkRateLimit('login', 'user@test.com');
    expect(blocked.allowed).toBe(false);

    // Advance past window
    vi.setSystemTime(new Date('2026-01-15T12:16:00Z'));
    const allowed = checkRateLimit('login', 'user@test.com');
    expect(allowed.allowed).toBe(true);
  });

  it('tracks different identifiers separately', () => {
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      checkRateLimit('login', 'user1@test.com');
    }
    const blocked = checkRateLimit('login', 'user1@test.com');
    const allowed = checkRateLimit('login', 'user2@test.com');
    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it('tracks register limits separately from login', () => {
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      checkRateLimit('login', 'user@test.com');
    }
    const loginBlocked = checkRateLimit('login', 'user@test.com');
    const registerAllowed = checkRateLimit('register', 'user@test.com');
    expect(loginBlocked.allowed).toBe(false);
    expect(registerAllowed.allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('parses X-Forwarded-For', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('falls back to X-Real-IP', () => {
    const headers = new Headers({ 'x-real-ip': '9.8.7.6' });
    expect(getClientIp(headers)).toBe('9.8.7.6');
  });

  it('prefers CF-Connecting-IP over spoofable X-Forwarded-For', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '6.6.6.6, 7.7.7.7',
    });
    expect(getClientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to 127.0.0.1', () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe('127.0.0.1');
  });

  it('trims whitespace from X-Forwarded-For', () => {
    const headers = new Headers({ 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' });
    expect(getClientIp(headers)).toBe('10.0.0.1');
  });
});
