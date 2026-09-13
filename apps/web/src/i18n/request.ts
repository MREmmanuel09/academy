import { type Locale, defaultLocale, isLocale, locales } from '@academy/i18n';
import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

async function loadMessages(locale: Locale): Promise<AbstractIntlMessages> {
  const mod = await import(`../../../../packages/i18n/src/messages/${locale}.json`);
  return (mod as { default: AbstractIntlMessages }).default;
}

/**
 * Merge locale messages with English fallback for any missing keys.
 * The catalogues for the 10 supported locales are intentionally complete
 * today, but this guards against a partial translation slipping through
 * (e.g. someone adds a key to en.json and forgets the rest). The fallback
 * is shallow per namespace, which matches our flat namespace structure.
 */
async function loadWithFallback(locale: Locale): Promise<AbstractIntlMessages> {
  const primary = await loadMessages(locale);
  if (locale === 'en') return primary;
  const fallback = await loadMessages('en');
  const merged: Record<string, Record<string, string>> = {};
  for (const [ns, values] of Object.entries(primary)) {
    const nsRecord = values as Record<string, string>;
    const fbRecord = (fallback[ns] as Record<string, string> | undefined) ?? {};
    merged[ns] = { ...fbRecord, ...nsRecord };
  }
  return merged as AbstractIntlMessages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) ?? defaultLocale;
  if (!isLocale(requested)) notFound();
  if (!(locales as readonly string[]).includes(requested)) notFound();
  const locale: Locale = requested;
  return {
    locale,
    messages: await loadWithFallback(locale),
  };
});
