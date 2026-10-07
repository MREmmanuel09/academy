import { loginSchema, onboardingSchema, registerSchema } from '@/lib/auth/schema';
import { describe, expect, it } from 'vitest';

describe('registerSchema', () => {
  it('accepts a valid input', () => {
    const result = registerSchema.safeParse({
      email: 'foo@bar.com',
      password: 'longenough1',
      name: 'Foo',
      preferredLocale: 'es',
    });
    expect(result.success).toBe(true);
  });
  it('defaults preferredLocale to es', () => {
    const r = registerSchema.parse({
      email: 'foo@bar.com',
      password: 'longenough1',
      name: 'Foo',
    });
    expect(r.preferredLocale).toBe('es');
  });
  it('rejects invalid email', () => {
    const r = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'longenough1',
      name: 'Foo',
    });
    expect(r.success).toBe(false);
  });
  it('rejects short password', () => {
    const r = registerSchema.safeParse({
      email: 'foo@bar.com',
      password: 'short',
      name: 'Foo',
    });
    expect(r.success).toBe(false);
  });
  it('rejects a password without a digit', () => {
    const r = registerSchema.safeParse({
      email: 'foo@bar.com',
      password: 'onlyletters',
      name: 'Foo',
    });
    expect(r.success).toBe(false);
  });
  it('rejects a password without a letter', () => {
    const r = registerSchema.safeParse({
      email: 'foo@bar.com',
      password: '1234567890',
      name: 'Foo',
    });
    expect(r.success).toBe(false);
  });
  it('rejects an 8-char mixed password (min is 10)', () => {
    const r = registerSchema.safeParse({
      email: 'foo@bar.com',
      password: 'pass1234',
      name: 'Foo',
    });
    expect(r.success).toBe(false);
  });
  it('rejects empty name', () => {
    const r = registerSchema.safeParse({
      email: 'foo@bar.com',
      password: 'longenough1',
      name: '',
    });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'foo@bar.com', password: 'any' }).success).toBe(true);
  });
  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({ email: 'foo@bar.com' }).success).toBe(false);
  });
});

describe('onboardingSchema', () => {
  it('accepts a valid selection', () => {
    const r = onboardingSchema.safeParse({
      preferredLocale: 'es',
      timezone: 'America/Guatemala',
      goals: ['devops', 'english'],
    });
    expect(r.success).toBe(true);
  });
  it('requires at least one goal', () => {
    const r = onboardingSchema.safeParse({
      preferredLocale: 'es',
      timezone: 'UTC',
      goals: [],
    });
    expect(r.success).toBe(false);
  });
  it('rejects unknown goals', () => {
    const r = onboardingSchema.safeParse({
      preferredLocale: 'es',
      timezone: 'UTC',
      goals: ['devops', 'underwater-basket-weaving'],
    });
    expect(r.success).toBe(false);
  });
});
