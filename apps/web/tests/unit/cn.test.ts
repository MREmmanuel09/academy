import { cn } from '@academy/ui';
import { describe, expect, it } from 'vitest';

describe('cn (className utility)', () => {
  it('merges simple class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('resolves tailwind conflicts (last one wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('keeps unrelated classes', () => {
    expect(cn('text-sm', 'text-red-500')).toContain('text-red-500');
  });
});
