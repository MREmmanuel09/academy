import { defaultLocale, locales } from '@academy/i18n';

/**
 * Pick the best locale for the app root (`/` under basePath), mirroring
 * what the next-intl middleware does for every other path:
 *
 * 1. `NEXT_LOCALE` cookie (set by next-intl on locale switch).
 * 2. `Accept-Language` header (exact tag, then primary subtag).
 * 3. The configured default locale.
 *
 * Needed because Next.js does not invoke middleware for the basePath
 * root itself (`/academy`, `/academy/`), so the intl middleware never
 * gets a chance to redirect it to a locale-prefixed URL.
 */
export function pickRootLocale(
  acceptLanguage: string | null,
  cookieLocale: string | undefined,
): string {
  const supported = new Set<string>(locales as readonly string[]);
  if (cookieLocale && supported.has(cookieLocale)) return cookieLocale;
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(',')) {
      const tag = part.split(';')[0]?.trim().toLowerCase();
      if (!tag) continue;
      if (supported.has(tag)) return tag;
      const primary = tag.split('-')[0];
      if (primary && supported.has(primary)) return primary;
    }
  }
  return defaultLocale;
}
