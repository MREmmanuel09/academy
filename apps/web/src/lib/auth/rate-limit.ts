/**
 * Simple in-memory rate limiter for auth endpoints.
 *
 * Uses a sliding window counter approach. This is suitable for single-instance
 * deployments (the default). For multi-instance deployments, consider using
 * Redis or a similar shared store.
 *
 * Security properties:
 * - Per-IP rate limiting for login/register attempts
 * - Configurable window and max attempts
 * - Automatic cleanup of expired entries
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Window size in seconds */
  windowSeconds: number;
  /** Maximum attempts within the window */
  maxAttempts: number;
}

/** Default rate limits for different actions */
export const RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes */
  login: {
    windowSeconds: 15 * 60,
    maxAttempts: 5,
  },
  /** Register: 3 attempts per hour */
  register: {
    windowSeconds: 60 * 60,
    maxAttempts: 3,
  },
  /** General API: 60 requests per minute */
  api: {
    windowSeconds: 60,
    maxAttempts: 60,
  },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Check if a request should be rate-limited.
 *
 * @param action - The action being rate-limited (login, register, api)
 * @param identifier - Unique identifier (typically IP address)
 * @returns Object with `allowed` boolean and `retryAfterSeconds` if blocked
 */
export function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
): { allowed: boolean; retryAfterSeconds?: number; remaining: number } {
  // E2E escape hatch: the Playwright suite registers many users from a
  // single IP, which would trip the register bucket (3/hour/IP) and make
  // the suite order-dependent. Strictly opt-in via explicit env var
  // (wired through `webServer.env` in playwright.config.ts); limits stay
  // enforced by default in every environment, including production.
  if (process.env.E2E_BYPASS_RATE_LIMIT === '1') {
    return { allowed: true, remaining: RATE_LIMITS[action].maxAttempts };
  }

  cleanup();

  const config = RATE_LIMITS[action];
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(key);

  // Entry expired or doesn't exist: create new window
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }

  // Within window: increment counter
  entry.count += 1;

  if (entry.count > config.maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
  };
}

/**
 * Get client IP from request headers.
 *
 * Order matters for spoof-resistance behind Cloudflare Tunnel:
 * 1. `CF-Connecting-IP` — set by Cloudflare's edge, cannot be spoofed
 *    by clients (Cloudflare overwrites it). Authoritative in prod.
 * 2. `X-Forwarded-For` first entry — only trustworthy when the last
 *    proxy is under our control (homelab tunnel); a client can prepend
 *    arbitrary values, so this is a fallback, not a guarantee.
 * 3. `X-Real-IP` — same caveat as XFF.
 */
export function getClientIp(headers: Headers): string {
  const cfIp = headers.get('cf-connecting-ip')?.trim();
  if (cfIp) {
    return cfIp;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs; use the first (client)
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for local development
  return '127.0.0.1';
}
