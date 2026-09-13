/**
 * i18n configuration shared between server and client.
 * Single source of truth for supported locales.
 *
 * The UI string catalogue is translated into all 10 locales. Course content
 * (lessons, episodes, roleplays, vocab) is bilingual es/en by design — other
 * locales see the es content with the UI chrome in their own language.
 */
export const locales = ['es', 'en', 'pt', 'fr', 'de', 'it', 'pl', 'zh', 'ja', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export const localeLabels: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pl: 'Polski',
  zh: '中文',
  ja: '日本語',
  ar: 'العربية',
};

const FULLY_TRANSLATED = ['es', 'en'] as const;
export type ContentLocale = (typeof FULLY_TRANSLATED)[number];

/**
 * Locales whose content (lessons, episodes, vocab) is fully translated.
 * Anything outside this list shows the Spanish content with a translated UI.
 * Used by the content loaders to pick the right body file at render time.
 */
export const fullyTranslatedLocales: ReadonlyArray<ContentLocale> = FULLY_TRANSLATED;

export const rtlLocales: ReadonlySet<Locale> = new Set(['ar']);

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function isContentLocale(value: string): value is ContentLocale {
  return (FULLY_TRANSLATED as readonly string[]).includes(value);
}

/**
 * Returns the content locale for a UI locale.
 * Non-bilingual UI locales fall back to Spanish for the lesson body,
 * which keeps the rest of the chrome translated.
 */
export function contentLocaleFor(uiLocale: Locale): ContentLocale {
  return isContentLocale(uiLocale) ? uiLocale : 'es';
}
