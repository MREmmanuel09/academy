import { bktUpdate, masteryBucket, topicKey } from '@/lib/mastery';
import { describe, expect, it } from 'vitest';

describe('bktUpdate', () => {
  it('raises mastery on correct and lowers on incorrect', () => {
    expect(bktUpdate(0.3, true)).toBeGreaterThan(0.3);
    expect(bktUpdate(0.3, false)).toBeLessThan(0.3);
  });

  it('converges high after repeated correct answers', () => {
    let p = 0.3;
    for (let i = 0; i < 6; i += 1) p = bktUpdate(p, true);
    expect(p).toBeGreaterThan(0.8);
  });

  it('converges low after repeated incorrect answers', () => {
    let p = 0.5;
    for (let i = 0; i < 6; i += 1) p = bktUpdate(p, false);
    expect(p).toBeLessThan(0.2);
  });

  it('stays within [0, 1] at the boundaries', () => {
    expect(bktUpdate(1, true)).toBeLessThanOrEqual(1);
    expect(bktUpdate(0, false)).toBeGreaterThanOrEqual(0);
    expect(bktUpdate(1, false)).toBeGreaterThanOrEqual(0);
  });

  it('accounts for guessing (low prior + correct stays modest)', () => {
    const one = bktUpdate(0.1, true);
    expect(one).toBeGreaterThan(0.1);
    expect(one).toBeLessThan(0.6);
  });
});

describe('mastery helpers', () => {
  it('builds topic keys as course/unit', () => {
    expect(topicKey('devops', 'linux')).toBe('devops/linux');
  });

  it('buckets mastery into four levels', () => {
    expect(masteryBucket(0.9)).toBe('mastered');
    expect(masteryBucket(0.7)).toBe('strong');
    expect(masteryBucket(0.5)).toBe('developing');
    expect(masteryBucket(0.2)).toBe('weak');
  });
});
