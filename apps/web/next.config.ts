import { createRequire } from 'node:module';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  output: 'standalone',
  // Public sub-path behind the shared homelab funnel
  // (https://host/academy/...). Applies to dev, build and tests alike —
  // localhost access also requires the prefix. MUST stay in sync with
  // BASE_PATH in src/lib/base-path.ts.
  basePath: '/academy',
  transpilePackages: ['@academy/db', '@academy/i18n', '@academy/ui', '@academy/content'],
  serverExternalPackages: ['better-sqlite3'],
  // Security headers applied to every route. Deliberately no
  // Content-Security-Policy: Next.js flight data + inline theme script
  // need nonces, which requires middleware plumbing (follow-up, not
  // go-live blocker — Cloudflare can also enforce edge policies).
  // microphone=(self): speaking practice uses getUserMedia same-origin.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
        ],
      },
    ];
  },
  // Allow our workspace packages (which use ESM-style `.js` extensions in
  // their TypeScript source) to resolve to `.ts` files at build time.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

// Compose with the PWA wrapper. next-pwa is intentionally applied last so that
// PWA-specific rewrites (service worker, manifest) win over earlier config.
// We use createRequire because next.config.ts is loaded as ESM but next-pwa
// still ships a CommonJS entry point.
const require = createRequire(import.meta.url);
const withPwa = require('./next-pwa.config.cjs') as (
  config: Parameters<typeof withNextIntl>[0],
) => ReturnType<typeof withNextIntl>;

export default withPwa(withNextIntl(nextConfig));
