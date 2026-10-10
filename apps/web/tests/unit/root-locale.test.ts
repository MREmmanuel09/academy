import { pickRootLocale } from '@/lib/resolve-locale';
import { describe, expect, it } from 'vitest';

describe('pickRootLocale (app root negotiation)', () => {
  it('prefers the NEXT_LOCALE cookie when it names a supported locale', () => {
    expect(pickRootLocale('es-ES,es;q=0.9', 'pt')).toBe('pt');
  });

  it('ignores a cookie naming an unknown locale', () => {
    expect(pickRootLocale('es-ES,es;q=0.9', 'xx')).toBe('es');
  });

  it.each([
    ['es-ES,es;q=0.9,en;q=0.8', undefined, 'es'],
    ['pt-BR,pt;q=0.9,en;q=0.8', undefined, 'pt'],
    ['en-US,en;q=0.9', undefined, 'en'],
    ['fr-FR,fr;q=0.9', undefined, 'fr'],
    ['de-DE,de;q=0.9', undefined, 'de'],
    ['zh-CN,zh;q=0.9', undefined, 'zh'],
    ['ja-JP,ja;q=0.9', undefined, 'ja'],
    ['ar-EG,ar;q=0.9', undefined, 'ar'],
    ['xx-YY,zz;q=0.9', undefined, 'es'],
  ])('negotiates %s (cookie %s) as %s', (header, cookie, expected) => {
    expect(pickRootLocale(header, cookie)).toBe(expected);
  });

  it('falls back to the default locale without any signal', () => {
    expect(pickRootLocale(null, undefined)).toBe('es');
  });
});
