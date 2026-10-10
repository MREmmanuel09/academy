/**
 * Public sub-path the app is served from.
 *
 * MUST match `basePath` in `apps/web/next.config.ts`. Single source of
 * truth for hand-built URLs (middleware redirects, plain `<a>` download
 * links, PWA manifest) that Next.js does not prefix automatically.
 */
export const BASE_PATH = '/academy';
