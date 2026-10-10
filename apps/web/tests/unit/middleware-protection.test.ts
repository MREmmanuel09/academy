import { isProtectedPath, stripBasePath, stripLocale } from '@/middleware';
import { describe, expect, it } from 'vitest';

describe('middleware protected-prefix matcher', () => {
  it.each([
    ['/dashboard', true],
    ['/es/dashboard', true],
    ['/en/dashboard/sub', true],
    ['/achievements', true],
    ['/es/achievements', true],
    ['/practice/srs', true],
    ['/practice/quiz?quiz=exam-basic', true],
    ['/settings', true],
    // Newly added locales (Fase 8) should be matched too.
    ['/pt/dashboard', true],
    ['/fr/practice/srs', true],
    ['/ar/settings', true],
    // Negative cases.
    ['/zh-CN/dashboard', false], // zh-CN isn't a registered locale.
    ['/', false],
    ['/es', false],
    ['/courses', false],
    ['/es/courses/devops', false],
    ['/login', false],
    ['/demo', false],
  ])('isProtectedPath matches %s as protected=%s', (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });

  it('does NOT match /dashboardish or /achievementsish (boundary check)', () => {
    expect(isProtectedPath('/dashboardish')).toBe(false);
    expect(isProtectedPath('/achievementsish')).toBe(false);
  });

  it.each([
    ['/es/dashboard', '/dashboard'],
    ['/en/practice/srs', '/practice/srs'],
    ['/pt/settings', '/settings'],
    ['/fr/achievements', '/achievements'],
    ['/ar/achievements', '/achievements'],
    ['/zh/whatever', '/whatever'],
    ['/dashboard', '/dashboard'],
    ['/', '/'],
  ])('stripLocale("%s") -> "%s"', (input, expected) => {
    expect(stripLocale(input)).toBe(expected);
  });

  it.each([
    ['/academy/es/dashboard', '/es/dashboard'],
    ['/academy/api/health', '/api/health'],
    ['/academy', '/'],
    ['/es/dashboard', '/es/dashboard'],
    ['/api/health', '/api/health'],
    ['/', '/'],
  ])('stripBasePath("%s") -> "%s"', (input, expected) => {
    expect(stripBasePath(input)).toBe(expected);
  });

  it('protects dashboard/practice paths behind the /academy prefix', () => {
    // The middleware strips the base path first, so the composed check
    // must stay protected — otherwise /academy/dashboard would bypass auth.
    for (const p of ['/academy/dashboard', '/academy/es/practice/srs', '/academy/settings']) {
      expect(isProtectedPath(stripBasePath(p))).toBe(true);
    }
    expect(isProtectedPath(stripBasePath('/academy/es/courses/x'))).toBe(false);
  });
});
