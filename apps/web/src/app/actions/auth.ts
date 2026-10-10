'use server';

import { signIn, signOut } from '@/auth';
import { hashPassword, normalizeEmail } from '@/lib/auth/password';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { loginSchema, onboardingSchema, registerSchema } from '@/lib/auth/schema';
import { BASE_PATH } from '@/lib/base-path';
import { logger } from '@/lib/logger';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const authLogger = logger.child({ module: 'auth' });

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Register a new user with email + password.
 *
 * - Normalises email (lowercase + trim).
 * - Hashes password with bcrypt (cost 12).
 * - Pre-checks for duplicate email (returns user-friendly error).
 * - Calls signIn() to mint a session in one step.
 * - Rate limited: 3 attempts per hour per IP.
 */
export async function registerAction(formData: FormData): Promise<ActionResult> {
  const hdrs = await headers();
  const clientIp = getClientIp(hdrs);
  const rateLimit = checkRateLimit('register', clientIp);

  if (!rateLimit.allowed) {
    authLogger.warn('Registration rate limited', { ip: clientIp });
    return {
      ok: false,
      error: `Demasiados intentos. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
    };
  }

  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    preferredLocale: formData.get('preferredLocale') ?? 'es',
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password, name, preferredLocale } = parsed.data;
  const normalised = normalizeEmail(email);
  const db = getDb() as SqliteDb;

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, normalised))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: 'Ya existe una cuenta con ese email',
      fieldErrors: { email: ['Email ya registrado'] },
    };
  }

  const passwordHash = await hashPassword(password);
  const tz =
    typeof Intl !== 'undefined' && 'DateTimeFormat' in Intl
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';

  await db.insert(schema.users).values({
    email: normalised,
    name,
    passwordHash,
    preferredLocale,
    timezone: tz,
  });

  // Sign the user in. signIn throws NEXT_REDIRECT on success — re-thrown.
  // NOTE: Auth.js uses redirectTo verbatim (it knows nothing about Next
  // basePath), so the public prefix goes here by hand. Locale detection
  // still applies: the intl middleware prefixes the locale on the way in.
  await signIn('credentials', {
    email: normalised,
    password,
    redirectTo: `${BASE_PATH}/onboarding`,
  });

  return { ok: true };
}

/**
 * Log in with email + password. Wraps signIn() with proper error
 * reporting (rather than the default Auth.js redirect-on-error).
 * Rate limited: 5 attempts per 15 minutes per IP.
 */
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const hdrs = await headers();
  const clientIp = getClientIp(hdrs);
  const rateLimit = checkRateLimit('login', clientIp);

  if (!rateLimit.allowed) {
    authLogger.warn('Login rate limited', { ip: clientIp });
    return {
      ok: false,
      error: `Demasiados intentos de inicio de sesión. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
    };
  }

  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const normalised = normalizeEmail(parsed.data.email);

  try {
    await signIn('credentials', {
      email: normalised,
      password: parsed.data.password,
      redirectTo: `${BASE_PATH}/dashboard`,
    });
    return { ok: true };
  } catch (err) {
    // signIn throws a NEXT_REDIRECT error on success — let it propagate.
    if (
      err instanceof Error &&
      'digest' in err &&
      typeof err.digest === 'string' &&
      err.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err;
    }
    return {
      ok: false,
      error: 'Email o contraseña incorrectos',
    };
  }
}

/**
 * Log out the current user and redirect to the home page.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: `${BASE_PATH}/` });
}

/**
 * Onboarding step — save locale/timezone/goals after a fresh sign-up.
 * Used by /onboarding page; redirects to /dashboard on success.
 */
export async function completeOnboardingAction(formData: FormData): Promise<ActionResult> {
  const { auth } = await import('@/auth');
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const goalsRaw = formData.getAll('goals').map(String);
  const raw = {
    preferredLocale: formData.get('preferredLocale'),
    timezone: formData.get('timezone') ?? 'UTC',
    goals: goalsRaw,
  };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const db = getDb() as SqliteDb;
  await db
    .update(schema.users)
    .set({
      preferredLocale: parsed.data.preferredLocale,
      timezone: parsed.data.timezone,
    })
    .where(eq(schema.users.id, session.user.id));

  redirect('/dashboard');
}
