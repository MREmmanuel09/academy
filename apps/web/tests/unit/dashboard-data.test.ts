import { DEFAULT_ACHIEVEMENTS, evaluateAchievements } from '@/lib/achievements';
/**
 * Unit tests for the dashboard data calculations. We don't render the
 * full page here (that's covered by the E2E smoke test). Instead we
 * exercise the building blocks: progress aggregation, SRS due
 * counting, achievement evaluation.
 */
import { describe, expect, it } from 'vitest';

describe('dashboard data — evaluateAchievements', () => {
  it('returns no unlocks for a brand-new user', () => {
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, {
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
    });
    expect(r.unlocked).toEqual([]);
  });

  it('unlocks first-step after 1 lesson', () => {
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, {
      lessonsCompleted: 1,
      lessonsCompletedByTrack: {},
      labsCompleted: 0,
      projectsCompleted: 0,
      quizzesPerfect: 0,
      vocabSeen: 0,
      englishEpisodesCompleted: 0,
      srsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
      currentStreak: 0,
      totalXp: 0,
    });
    expect(r.unlocked).toContain('first-lesson');
  });

  it('unlocks multiple achievements at once', () => {
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, {
      lessonsCompleted: 5,
      lessonsCompletedByTrack: { devops: 5 },
      labsCompleted: 0,
      projectsCompleted: 0,
      quizzesPerfect: 0,
      vocabSeen: 0,
      englishEpisodesCompleted: 0,
      srsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
      currentStreak: 3,
      totalXp: 150,
    });
    // first-lesson (1 lesson), devops-5 (5 devops), streak-3
    expect(r.unlocked).toContain('first-lesson');
    expect(r.unlocked).toContain('devops-5');
    expect(r.unlocked).toContain('streak-3');
  });

  it('awards the meta achievement when multiple sub-rules match', () => {
    const r = evaluateAchievements(DEFAULT_ACHIEVEMENTS, {
      lessonsCompleted: 5,
      lessonsCompletedByTrack: {},
      labsCompleted: 0,
      projectsCompleted: 0,
      quizzesPerfect: 0,
      vocabSeen: 0,
      englishEpisodesCompleted: 0,
      srsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
      currentStreak: 3,
      totalXp: 100,
    });
    // meta-fully-loaded needs 5 lessons AND streak 3
    expect(r.unlocked).toContain('meta-fully-loaded');
  });
});

describe('xpToNextLevel (gamification integration)', () => {
  it('returns level 1 with 0 XP', async () => {
    const { xpToNextLevel } = await import('@/lib/gamification');
    const r = xpToNextLevel(0);
    expect(r.currentLevel).toBe(1);
    expect(r.nextLevel).toBe(2);
    expect(r.xpIntoLevel).toBe(0);
    expect(r.xpNeededForNext).toBe(50);
  });

  it('reports the right level at 60 XP', async () => {
    const { xpToNextLevel } = await import('@/lib/gamification');
    const r = xpToNextLevel(60);
    // xpForLevel(2)=50, xpForLevel(3)=200 → 60 is in level 2
    expect(r.currentLevel).toBe(2);
    expect(r.xpIntoLevel).toBe(10);
  });
});
