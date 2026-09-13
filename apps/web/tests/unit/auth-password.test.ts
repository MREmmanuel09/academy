import { hashPassword, normalizeEmail, verifyPassword } from '@/lib/auth/password';
import { describe, expect, it } from 'vitest';

describe('password hashing', () => {
  it('hashes and verifies a strong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('mypassword123');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects empty hash', async () => {
    expect(await verifyPassword('any', '')).toBe(false);
  });

  it('rejects short passwords', async () => {
    await expect(hashPassword('short')).rejects.toThrow(/at least 8/i);
  });

  it('produces different hashes for the same input (salt)', async () => {
    const a = await hashPassword('samepassword123');
    const b = await hashPassword('samepassword123');
    expect(a).not.toBe(b);
    expect(await verifyPassword('samepassword123', a)).toBe(true);
    expect(await verifyPassword('samepassword123', b)).toBe(true);
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Foo@BAR.com  ')).toBe('foo@bar.com');
  });
  it('keeps already-clean emails unchanged', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});
