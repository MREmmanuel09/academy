import {
  XP_RATE_LIMIT_PER_MINUTE,
  applyXpBatch,
  levelFromXp,
  updateStreak,
  xpForEvent,
  xpForLevel,
  xpToNextLevel,
} from '@/lib/gamification';
import { describe, expect, it } from 'vitest';

describe('gamification — xpForEvent', () => {
  it('returns base reward for fixed-amount events', () => {
    expect(xpForEvent({ kind: 'lesson' })).toBe(10);
    expect(xpForEvent({ kind: 'lab' })).toBe(25);
    expect(xpForEvent({ kind: 'srsReview' })).toBe(1);
    expect(xpForEvent({ kind: 'dailyChallenge' })).toBe(30);
  });

  it('returns perfect reward for 100% quiz score', () => {
    expect(xpForEvent({ kind: 'quizPerfect', score: 1 })).toBe(25);
  });

  it('returns pass reward for >= 70% quiz score', () => {
    expect(xpForEvent({ kind: 'quizPerfect', score: 0.7 })).toBe(10);
    expect(xpForEvent({ kind: 'quizPerfect', score: 0.85 })).toBe(10);
  });

  it('returns 0 for sub-70% quiz score', () => {
    expect(xpForEvent({ kind: 'quizPerfect', score: 0.5 })).toBe(0);
    expect(xpForEvent({ kind: 'quizPerfect', score: 0.69 })).toBe(0);
  });
});

describe('gamification — applyXpBatch (rate-limited)', () => {
  it('awards XP for a single event', () => {
    const r = applyXpBatch(0, [{ event: { kind: 'lesson' }, minutesAgo: 0 }]);
    expect(r.totalXp).toBe(10);
    expect(r.gainedXp).toBe(10);
    expect(r.dropped).toBe(0);
  });

  it('drops events beyond the per-minute rate limit', () => {
    const tooMany = Array.from({ length: XP_RATE_LIMIT_PER_MINUTE + 5 }, () => ({
      event: { kind: 'lesson' as const },
      minutesAgo: 0,
    }));
    const r = applyXpBatch(0, tooMany);
    expect(r.dropped).toBe(5);
    expect(r.gainedXp).toBe(XP_RATE_LIMIT_PER_MINUTE * 10);
  });

  it('srsReview has a higher bucket than lessons (bulk reviews ok)', () => {
    // 50 reviews in one minute — well within SRS bucket (200), but
    // way over the default lesson bucket (20). Should pass.
    const bulkReviews = Array.from({ length: 50 }, () => ({
      event: { kind: 'srsReview' as const },
      minutesAgo: 0,
    }));
    const r = applyXpBatch(0, bulkReviews);
    expect(r.dropped).toBe(0);
    expect(r.gainedXp).toBe(50);
  });

  it('limits are per-kind (SRS + lessons in same minute do not collide)', () => {
    // 20 lessons + 50 SRS reviews in the same minute. Both should
    // pass because the buckets are independent.
    const mixed = [
      ...Array.from({ length: 20 }, () => ({ event: { kind: 'lesson' as const }, minutesAgo: 0 })),
      ...Array.from({ length: 50 }, () => ({
        event: { kind: 'srsReview' as const },
        minutesAgo: 0,
      })),
    ];
    const r = applyXpBatch(0, mixed);
    expect(r.dropped).toBe(0);
  });

  it('rate limit is per-minute bucket, not global', () => {
    const events = [
      ...Array.from({ length: XP_RATE_LIMIT_PER_MINUTE }, (_, i) => ({
        event: { kind: 'lesson' as const },
        minutesAgo: i / XP_RATE_LIMIT_PER_MINUTE, // 0..<1 minute
      })),
      ...Array.from({ length: 3 }, () => ({
        event: { kind: 'lesson' as const },
        minutesAgo: 1.5, // different bucket
      })),
    ];
    const r = applyXpBatch(0, events);
    expect(r.dropped).toBe(0);
  });

  it('aggregates XP from mixed event types', () => {
    const events = [
      { event: { kind: 'lesson' as const }, minutesAgo: 10 },
      { event: { kind: 'lab' as const }, minutesAgo: 20 },
      { event: { kind: 'dailyChallenge' as const }, minutesAgo: 30 },
    ];
    const r = applyXpBatch(0, events);
    expect(r.gainedXp).toBe(10 + 25 + 30);
  });
});

describe('gamification — level curve', () => {
  it('xpForLevel(1) is 0', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('xpForLevel grows quadratically', () => {
    expect(xpForLevel(2)).toBe(50);
    expect(xpForLevel(3)).toBe(200);
    expect(xpForLevel(5)).toBe(800);
    expect(xpForLevel(10)).toBe(4050);
  });

  it('levelFromXp inverts the curve for the exact threshold', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
  });

  it('levelFromXp floors at the threshold (right-continuous)', () => {
    // Thresholds from xpForLevel: L1=0, L2=50, L3=200, L4=450, L5=800.
    // The user is at level N when their XP is in [threshold(N), threshold(N+1)).
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(199)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(449)).toBe(3);
    expect(levelFromXp(450)).toBe(4);
    expect(levelFromXp(799)).toBe(4);
    expect(levelFromXp(800)).toBe(5);
  });

  it('clamps to level 1 for negative XP', () => {
    expect(levelFromXp(-100)).toBe(1);
  });

  it('xpToNextLevel reports progress to the next level', () => {
    const r = xpToNextLevel(60);
    expect(r.currentLevel).toBe(2);
    expect(r.nextLevel).toBe(3);
    expect(r.xpIntoLevel).toBe(10);
    expect(r.xpNeededForNext).toBe(150); // 200 - 50
  });
});

describe('gamification — streak', () => {
  const base: import('@/lib/gamification').StreakState = {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
  };

  it('first-ever activity sets streak to 1', () => {
    const r = updateStreak(base, '2026-01-15');
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
    expect(r.lastActiveDate).toBe('2026-01-15');
  });

  it('same-day activity is a no-op (idempotent)', () => {
    const r1 = updateStreak(base, '2026-01-15');
    const r2 = updateStreak(r1, '2026-01-15');
    expect(r2).toEqual(r1);
  });

  it('next-day activity increments the streak', () => {
    const r1 = updateStreak(base, '2026-01-15');
    const r2 = updateStreak(r1, '2026-01-16');
    expect(r2.currentStreak).toBe(2);
    expect(r2.longestStreak).toBe(2);
  });

  it('multi-day gap breaks the streak and resets to 1', () => {
    const r1 = updateStreak(base, '2026-01-15');
    const r2 = updateStreak(r1, '2026-01-16');
    const r3 = updateStreak(r2, '2026-01-20'); // 4 days later
    expect(r3.currentStreak).toBe(1);
    expect(r3.longestStreak).toBe(2); // preserved from before
  });

  it('longest streak is the max over time, not the current', () => {
    let s = base;
    for (let d = 1; d <= 5; d += 1) {
      const day = `2026-01-${String(d).padStart(2, '0')}`;
      s = updateStreak(s, day);
    }
    expect(s.currentStreak).toBe(5);
    expect(s.longestStreak).toBe(5);

    // Break the streak.
    s = updateStreak(s, '2026-02-01');
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(5);
  });

  it('ignores malformed dates without corrupting state', () => {
    const r1 = updateStreak(base, '2026-01-15');
    const r2 = updateStreak(r1, 'not-a-date');
    expect(r2).toEqual(r1);
  });

  it('ignores future-dated activity (clock skew guard)', () => {
    const r1 = updateStreak(base, '2026-01-15');
    const r2 = updateStreak(r1, '2026-01-10');
    expect(r2).toEqual(r1);
  });
});
