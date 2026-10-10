import { routing } from '@/i18n/routing';
import { locales } from '@academy/i18n';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Routes that require an authenticated session.
 * We match the locale segment first (`/en`, `/es`, `/pt`, ...), then check the
 * rest. Anything matched here will redirect to /<locale>/login when the
 * Auth.js JWT session cookie is absent.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/practice',
  '/settings',
  '/profile',
  '/onboarding',
  '/achievements',
];

const LOCALE_PREFIX_RE = new RegExp(`^/(?:${(locales as readonly string[]).join('|')})(?=/|$)`);

function stripLocale(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX_RE, '') || '/';
}

function isProtectedPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return PROTECTED_PREFIXES.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

function localeFromPath(pathname: string): string {
  const m = pathname.match(LOCALE_PREFIX_RE);
  return m ? m[0] : `/${routing.defaultLocale}`;
}

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;

  // Run i18n routing first to get the locale redirect right.
  const intlResponse = intlMiddleware(req);

  // For protected paths, check the Auth.js JWT session cookie.
  // Edge middleware can't run `auth()` directly (it needs the full Node
  // runtime for bcrypt). Cheap pre-check: presence of the cookie.
  if (isProtectedPath(pathname)) {
    const sessionCookie =
      req.cookies.get('authjs.session-token') ?? req.cookies.get('__Secure-authjs.session-token');

    if (!sessionCookie) {
      const localePrefix = localeFromPath(pathname);
      const loginUrl = new URL(`${localePrefix}/login`, req.url);
      loginUrl.searchParams.set('next', pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|monitor|sw\\.js|workbox.*|manifest\\.json|icons|favicon|apple-touch-icon|.*\\..*).*)',
  ],
};

// Re-export for testing.
export { stripLocale, isProtectedPath, localeFromPath };
