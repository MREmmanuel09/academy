import { routing } from '@/i18n/routing';
import { BASE_PATH } from '@/lib/base-path';
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

/**
 * Remove the public base path before locale/auth matching. No-op for
 * paths without the prefix (e.g. direct localhost access to /api/* —
 * though note the app itself only serves pages under the prefix).
 */
export function stripBasePath(pathname: string): string {
  if (pathname === BASE_PATH) return '/';
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length) || '/';
  return pathname;
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
  const { search } = req.nextUrl;
  // Match locale/auth rules on the path WITHOUT the public prefix so the
  // same rules hold behind the funnel (/academy/...) and locally.
  const pathname = stripBasePath(req.nextUrl.pathname);

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
      // Absolute redirect target: re-add the public prefix (Next.js does
      // not prefix manually-built absolute URLs with basePath).
      const loginUrl = new URL(`${BASE_PATH}${localePrefix}/login`, req.url);
      loginUrl.searchParams.set('next', pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  // Paths are matched WITH the public prefix when present, so every
  // exclusion exists twice (with and without it). Dotted files
  // (sw.js, manifest.json, icons, favicons) are already covered by .*\\..*.
  matcher: [
    '/((?!api|academy/api|_next|academy/_next|_vercel|monitor|academy/monitor|sw\\.js|workbox.*|manifest\\.json|icons|favicon|apple-touch-icon|.*\\..*).*)',
  ],
};

// Re-export for testing.
export { stripLocale, isProtectedPath, localeFromPath };
