import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/auth/schema';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import NextAuth, { type DefaultSession } from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isDemo: boolean;
      preferredLocale: 'es' | 'en';
      timezone: string;
    } & DefaultSession['user'];
  }

  interface User {
    isDemo?: boolean;
    preferredLocale?: 'es' | 'en';
    timezone?: string;
  }
}

/** Shape of the extra fields we attach to the JWT. */
interface AppTokenFields {
  id?: string;
  isDemo?: boolean;
  preferredLocale?: 'es' | 'en';
  timezone?: string;
}

/**
 * Auth.js v5 (NextAuth) root config.
 *
 * Strategy: Credentials provider + JWT sessions.
 *
 * Auth.js does not support `database` strategy with `credentials` (see
 * https://errors.authjs.dev#unsupportedstrategy). The two are
 * mutually exclusive in v5: `credentials` requires JWT.
 *
 * Security properties preserved:
 *   - Sessions are signed with `AUTH_SECRET` (HS256 by default).
 *   - Token maxAge set to 30 days; refresh on use.
 *   - For revocation (e.g. password change), bump a `tokenVersion`
 *     claim on the user and check it in the `session` callback.
 *   - We persist a `sessions` table anyway for future OAuth providers
 *     (Google, GitHub) which DO support DB sessions.
 */
const providers: Provider[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    authorize: async (raw) => {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;

      const db = getDb() as SqliteDb;
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, parsed.data.email))
        .limit(1);

      if (!user || !user.passwordHash) return null;
      const ok = await verifyPassword(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        isDemo: user.isDemo,
        preferredLocale: (user.preferredLocale as 'es' | 'en') ?? 'es',
        timezone: user.timezone,
      };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy our extra fields from the User returned by
      // `authorize()` into the JWT.
      if (user) {
        const appToken = token as typeof token & AppTokenFields;
        appToken.id = user.id;
        appToken.isDemo = user.isDemo ?? false;
        appToken.preferredLocale = user.preferredLocale ?? 'es';
        appToken.timezone = user.timezone ?? 'UTC';
      }
      return token;
    },
    async session({ session, token }) {
      const appToken = token as typeof token & AppTokenFields;
      if (appToken.id) {
        session.user.id = appToken.id;
        session.user.isDemo = appToken.isDemo ?? false;
        session.user.preferredLocale = (appToken.preferredLocale as 'es' | 'en') ?? 'es';
        session.user.timezone = appToken.timezone ?? 'UTC';
      }
      return session;
    },
  },
  trustHost: true,
});
