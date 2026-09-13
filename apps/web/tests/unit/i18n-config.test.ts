import { defaultLocale, isLocale, locales, rtlLocales } from '@academy/i18n';
import { describe, expect, it } from 'vitest';

describe('i18n config', () => {
  it('exposes all 10 supported locales', () => {
    expect(locales).toEqual(
      expect.arrayContaining(['es', 'en', 'pt', 'fr', 'de', 'it', 'pl', 'zh', 'ja', 'ar']),
    );
    expect(locales).toHaveLength(10);
  });

  it('defaults to es', () => {
    expect(defaultLocale).toBe('es');
  });

  it('isLocale validates every supported locale', () => {
    for (const l of locales) {
      expect(isLocale(l)).toBe(true);
    }
    // And rejects anything outside the catalogue.
    expect(isLocale('fr-CA')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale('xx')).toBe(false);
  });

  it('flags RTL locales (Arabic) for dir="rtl"', () => {
    expect(rtlLocales.has('ar')).toBe(true);
    expect(rtlLocales.has('en')).toBe(false);
    expect(rtlLocales.has('es')).toBe(false);
  });
});
