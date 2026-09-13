import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type Locale, defaultLocale, isLocale, locales } from './config.js';

async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  const messages = await import(`./messages/${locale}.json`);
  return messages.default as Record<string, string>;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) ?? defaultLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  return {
    locale,
    messages: await loadMessages(locale),
  };
});
