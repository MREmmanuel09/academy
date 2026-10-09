// @ts-check
/**
 * next-pwa (ducanh2912 fork, maintained for Next.js 15) configuration.
 *
 * Caching strategy:
 *   - Static assets (JS/CSS chunks, /icons/*, /audio/*): CacheFirst with
 *     long expiration. These are content-hashed and safe to cache.
 *   - Images: CacheFirst with 30-day expiration.
 *   - API calls (/api/*): NetworkFirst with 5s timeout — we want fresh
 *     data when online; stale is OK as a fallback.
 *   - Pages (navigations): StaleWhileRevalidate — show the cached version
 *     immediately, then refresh in the background. This is what makes
 *     the app feel "instant" on repeat visits and works offline.
 *   - Practice / dashboard pages: NetworkFirst with short timeout so
 *     users see fresh progress when online, but a stale snapshot is
 *     served when offline (the whole point of the PWA).
 *
 * The service worker is generated at build time and is disabled in
 * development (we don't want stale caches while developing).
 */
const withPwa = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    // NOTE: do NOT add modifyURLPrefix here — next-pwa already prefixes
    // precache URLs with basePath itself (adding it double-prefixes to
    // /academy/academy/...).
    navigateFallback: '/academy/',
    navigateFallbackDenylist: [/^\/academy\/api\//, /^\/academy\/sw\.js$/, /^\/academy\/workbox-/],
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === 'image',
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: ({ request }) =>
          request.destination === 'script' || request.destination === 'style' || request.destination === 'font',
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
          urlPattern: ({ url }) => url.pathname.startsWith('/academy/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      {
        // Practice and dashboard: prefer fresh data, fall back to cache
        // when the network is gone. This is what makes the PWA usable
        // on a flaky connection.
        urlPattern: ({ url }) =>
          /^\/(es|en|pt|fr|de|it|pl|zh|ja|ar)\/(practice|dashboard|achievements)(\/|$)/.test(
            url.pathname.replace(/^\/academy/, ''),
          ),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'practice-pages',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages',
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      {
          urlPattern: ({ url }) =>
          url.pathname.startsWith('/academy/audio/') || url.pathname.startsWith('/academy/icons/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'media',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        // Long-lived content (lessons, roleplays) — shipped to the
        // client in every locale. Cache-first because they only
        // change on deploy.
        urlPattern: ({ url }) =>
          /^\/(es|en|pt|fr|de|it|pl|zh|ja|ar)\/(courses|practice\/roleplay|practice\/vocab)(\/|$)/.test(
            url.pathname.replace(/^\/academy/, ''),
          ),
        handler: 'CacheFirst',
        options: {
          cacheName: 'content',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
});

module.exports = withPwa;
