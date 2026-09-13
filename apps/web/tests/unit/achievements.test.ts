import {
  type AchievementContext,
  type AchievementRule,
  DEFAULT_ACHIEVEMENTS,
  evaluateAchievements,
  lessonCountRule,
  matches,
} from '@/lib/achievements';
import { describe, expect, it } from 'vitest';

const baseContext: AchievementContext = {
  lessonsCompleted: 0,
  lessonsCompletedByTrack: {},
  labsCompleted: 0,
  projectsCompleted: 0,
  quizzesPerfect: 0,
  vocabSeen: 0,
  englishEpisodesCompleted: 0,
  srsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
  currentStreak: 0,
  totalXp: 0,
};

describe('achievements — rule: lesson_count', () => {
  it('matches when total is >= count', () => {
    expect(
      matches({ kind: 'lesson_count', count: 5 }, { ...baseContext, lessonsCompleted: 5 }),
    ).toBe(true);
    expect(
      matches({ kind: 'lesson_count', count: 5 }, { ...baseContext, lessonsCompleted: 4 }),
    ).toBe(false);
  });

  it('matches per-track when track is specified', () => {
    const ctx: AchievementContext = {
      ...baseContext,
      lessonsCompleted: 10,
      lessonsCompletedByTrack: { devops: 3, data: 7 },
    };
    expect(matches({ kind: 'lesson_count', count: 3, track: 'devops' }, ctx)).toBe(true);
    expect(matches({ kind: 'lesson_count', count: 4, track: 'devops' }, ctx)).toBe(false);
  });

  it('track filter does not match unrelated track', () => {
    const ctx: AchievementContext = {
      ...baseContext,
      lessonsCompletedByTrack: { english: 5 },
    };
    expect(matches({ kind: 'lesson_count', count: 1, track: 'devops' }, ctx)).toBe(false);
  });
});

describe('achievements — rule: streak', () => {
  it('matches when currentStreak >= days', () => {
    expect(matches({ kind: 'streak', days: 3 }, { ...baseContext, currentStreak: 3 })).toBe(true);
    expect(matches({ kind: 'streak', days: 3 }, { ...baseContext, currentStreak: 7 })).toBe(true);
    expect(matches({ kind: 'streak', days: 3 }, { ...baseContext, currentStreak: 2 })).toBe(false);
  });
});

describe('achievements — rule: srs_state', () => {
  it('matches when count of cards in the state is met', () => {
    const ctx: AchievementContext = {
      ...baseContext,
      srsByState: { new: 10, learning: 5, review: 50, relearning: 0 },
    };
    expect(matches({ kind: 'srs_state', state: 'review', count: 50 }, ctx)).toBe(true);
    expect(matches({ kind: 'srs_state', state: 'review', count: 51 }, ctx)).toBe(false);
    expect(matches({ kind: 'srs_state', state: 'learning', count: 5 }, ctx)).toBe(true);
  });
});

describe('achievements — rule: xp_threshold', () => {
  it('matches when totalXp >= threshold', () => {
    expect(matches({ kind: 'xp_threshold', xp: 100 }, { ...baseContext, totalXp: 100 })).toBe(true);
    expect(matches({ kind: 'xp_threshold', xp: 100 }, { ...baseContext, totalXp: 50 })).toBe(false);
  });
});

describe('achievements — rule: all_of', () => {
  it('is true only when every sub-rule matches', () => {
    const rule: AchievementRule = {
      kind: 'all_of',
      rules: [lessonCountRule(5), { kind: 'streak', days: 3 }],
    };
    const allMet: AchievementContext = {
      ...baseContext,
      lessonsCompleted: 5,
      currentStreak: 3,
    };
    expect(matches(rule, allMet)).toBe(true);

    const onlyLessons: AchievementContext = { ...baseContext, lessonsCompleted: 5 };
    expect(matches(rule, onlyLessons)).toBe(false);

    const onlyStreak: AchievementContext = { ...baseContext, currentStreak: 3 };
    expect(matches(rule, onlyStreak)).toBe(false);
  });

  it('handles nested all_of', () => {
    const rule: AchievementRule = {
      kind: 'all_of',
      rules: [
        { kind: 'xp_threshold', xp: 200 },
        {
          kind: 'all_of',
          rules: [lessonCountRule(3), { kind: 'streak', days: 2 }],
        },
      ],
    };
    const ok: AchievementContext = {
      ...baseContext,
      totalXp: 200,
      lessonsCompleted: 3,
      currentStreak: 2,
    };
    expect(matches(rule, ok)).toBe(true);
  });
});

describe('achievements — engine', () => {
  it('unlocks achievements whose rule matches a fresh user', () => {
    const ctx: AchievementContext = { ...baseContext, lessonsCompleted: 1 };
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, ctx);
    expect(r.unlocked).toContain('first-lesson');
  });

  it('does not re-unlock already-unlocked achievements', () => {
    const ctx: AchievementContext = { ...baseContext, lessonsCompleted: 1 };
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, ctx, new Set(['first-lesson']));
    expect(r.unlocked).not.toContain('first-lesson');
  });

  it('sums the XP of all newly-unlocked achievements', () => {
    const ctx: AchievementContext = {
      ...baseContext,
      lessonsCompleted: 5,
      currentStreak: 3,
      totalXp: 100,
    };
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, ctx);
    // Unlocked: first-lesson (25) + streak-3 (30) + xp-100 (0)
    //           + meta-fully-loaded (75, requires 5 lessons AND 3-day streak)
    // devops-5 does NOT unlock (no track info, lessonsByTrack.devops=undefined).
    const expectedXp = 25 + 30 + 0 + 75;
    expect(r.xpAwarded).toBe(expectedXp);
  });

  it('empty rule set returns nothing', () => {
    expect(evaluateAchievements([], baseContext)).toEqual({ unlocked: [], xpAwarded: 0 });
  });

  it('DEFAULT_ACHIEVEMENTS contains the curated set', () => {
    const slugs = DEFAULT_ACHIEVEMENTS.map((a) => a.slug);
    expect(slugs).toContain('first-lesson');
    expect(slugs).toContain('streak-30');
    expect(slugs).toContain('meta-fully-loaded');
  });
});

describe('achievements — meta rule (combined)', () => {
  it('meta-fully-loaded requires 5 lessons AND a 3-day streak', () => {
    const just: AchievementContext = { ...baseContext, lessonsCompleted: 5 };
    const r1 = evaluateAchievements(DEFAULT_ACHIEVEMENTS, just);
    expect(r1.unlocked).not.toContain('meta-fully-loaded');

    const both: AchievementContext = { ...baseContext, lessonsCompleted: 5, currentStreak: 3 };
    const r2 = evaluateAchievements(DEFAULT_ACHIEVEMENTS, both);
    expect(r2.unlocked).toContain('meta-fully-loaded');
  });
});
