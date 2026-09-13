import bcrypt from 'bcryptjs';

/**
 * Argon2 is the gold standard for password hashing, but it requires a
 * native build. For the homelab/hobby deployment, bcrypt with cost 12
 * gives a strong-enough security margin (≈250ms per hash on modern hw)
 * and ships as pure JS via `bcryptjs`, so no platform-specific binary.
 *
 * OWASP (2024) considers bcrypt cost 12+ acceptable. We use 12 to keep
 * login latency under 300ms while staying well above the floor.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * Normalise an email for storage and lookup. Lowercase + trim.
 * We intentionally do NOT hash emails — they need to be searchable.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
