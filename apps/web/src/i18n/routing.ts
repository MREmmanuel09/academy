import { defaultLocale, locales, rtlLocales } from '@academy/i18n';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

/**
 * Returns the HTML `dir` attribute for a locale. Right now only `ar` is RTL,
 * but exposing this helper keeps any future RTL additions honest.
 */
export function directionFor(locale: string): 'ltr' | 'rtl' {
  return rtlLocales.has(locale as (typeof locales)[number]) ? 'rtl' : 'ltr';
}
