import {
  type ProgressSnapshot,
  getFirstIncompleteLesson,
  getPathProgress,
  getUnitProgress,
  isLessonUnlocked,
  isPathComplete,
} from '@/lib/learning-path';
import type { LearningPath } from '@academy/content';
import { describe, expect, it } from 'vitest';

function testPath(): LearningPath {
  return {
    id: 'test',
    course: 'test',
    title: 'Test',
    description: 'd',
    externalExam: 'e',
    levels: [
      {
        id: 'l1',
        title: 'L1',
        description: 'd',
        units: [
          { unit: 'u1', objectives: ['o'], exams: [] },
          { unit: 'u2', objectives: ['o'], exams: [{ id: 'exam-u2', passingScore: 80 }] },
        ],
      },
      {
        id: 'l2',
        title: 'L2',
        description: 'd',
        units: [{ unit: 'u3', objectives: ['o'], exams: [] }],
        milestoneExam: { id: 'exam-m1', passingScore: 80 },
      },
    ],
  };
}

function lessonMap(): Map<string, string[]> {
  return new Map([
    ['u1', ['u1-l1', 'u1-l2']],
    ['u2', ['u2-l1']],
    ['u3', ['u3-l1']],
  ]);
}

const fresh: ProgressSnapshot = { completedLessonIds: new Set(), examBest: {} };

describe('learning-path gating', () => {
  it('locks everything after the first unit for a fresh user', () => {
    const states = getUnitProgress(testPath(), lessonMap(), fresh);
    expect(states.map((s) => s.status.status)).toEqual(['available', 'locked', 'locked']);
    const u2 = states[1];
    if (!u2) throw new Error('test setup: missing unit state');
    expect(u2.status.status).toBe('locked');
    if (u2.status.status === 'locked') expect(u2.status.blockedByUnit).toBe('u1');
  });

  it('unlocks the next unit when the previous completes (no exams)', () => {
    const snap: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2']),
      examBest: {},
    };
    const states = getUnitProgress(testPath(), lessonMap(), snap);
    expect(states.map((s) => s.status.status)).toEqual(['complete', 'available', 'locked']);
  });

  it('keeps a unit available (not complete) until its exam passes', () => {
    const snap: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2', 'u2-l1']),
      examBest: { 'exam-u2': 0.6 },
    };
    const states = getUnitProgress(testPath(), lessonMap(), snap);
    expect(states[1]?.status.status).toBe('available');
    expect(states[2]?.status.status).toBe('locked');
  });

  it('completes units; the level milestone caps the path, not entry', () => {
    const snap: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2', 'u2-l1']),
      examBest: { 'exam-u2': 0.9 },
    };
    const states = getUnitProgress(testPath(), lessonMap(), snap);
    // u3 is enterable (milestone comes after its level's units)...
    expect(states.map((s) => s.status.status)).toEqual(['complete', 'complete', 'available']);
    // ...but the path is not complete until the milestone passes.
    expect(isPathComplete(testPath(), lessonMap(), snap)).toBe(false);
    const done: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2', 'u2-l1', 'u3-l1']),
      examBest: { 'exam-u2': 0.9, 'exam-m1': 0.85 },
    };
    expect(isPathComplete(testPath(), lessonMap(), done)).toBe(true);
  });

  it('gates the next level on the previous milestone', () => {
    const path = testPath();
    // Move the milestone to level 1 so it gates level 2 entry.
    const firstLevel = path.levels[0];
    if (!firstLevel) throw new Error('test setup: missing level');
    firstLevel.milestoneExam = { id: 'exam-m1', passingScore: 80 };
    const snap: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2', 'u2-l1']),
      examBest: { 'exam-u2': 0.9 },
    };
    const states = getUnitProgress(path, lessonMap(), snap);
    expect(states.map((s) => s.status.status)).toEqual(['complete', 'complete', 'locked']);
    const u3 = states[2];
    if (u3?.status.status === 'locked') expect(u3.status.missingExams).toEqual(['exam-m1']);
    else throw new Error('test setup: expected u3 locked');
  });

  it('opens the next level once the milestone passes', () => {
    const snap: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2', 'u2-l1']),
      examBest: { 'exam-u2': 0.9, 'exam-m1': 1 },
    };
    const states = getUnitProgress(testPath(), lessonMap(), snap);
    expect(states.map((s) => s.status.status)).toEqual(['complete', 'complete', 'available']);
  });

  it('unlocks lessons strictly in sequence', () => {
    expect(isLessonUnlocked(testPath(), 'u1', 'u1-l1', lessonMap(), fresh)).toBe(true);
    expect(isLessonUnlocked(testPath(), 'u1', 'u1-l2', lessonMap(), fresh)).toBe(false);
    expect(isLessonUnlocked(testPath(), 'u2', 'u2-l1', lessonMap(), fresh)).toBe(false);
    const snap: ProgressSnapshot = { completedLessonIds: new Set(['u1-l1']), examBest: {} };
    expect(isLessonUnlocked(testPath(), 'u1', 'u1-l2', lessonMap(), snap)).toBe(true);
  });

  it('lets guests read everything', () => {
    const opts = { enforce: false };
    expect(isLessonUnlocked(testPath(), 'u3', 'u3-l1', lessonMap(), fresh, opts)).toBe(true);
    const states = getUnitProgress(testPath(), lessonMap(), fresh, opts);
    expect(states.every((s) => s.status.status !== 'locked')).toBe(true);
  });

  it('finds the first incomplete lesson and totals progress', () => {
    expect(getFirstIncompleteLesson(testPath(), lessonMap(), fresh)).toEqual({
      unit: 'u1',
      lessonId: 'u1-l1',
    });
    const snap: ProgressSnapshot = {
      completedLessonIds: new Set(['u1-l1', 'u1-l2', 'u2-l1', 'u3-l1']),
      examBest: { 'exam-u2': 1, 'exam-m1': 1 },
    };
    expect(getFirstIncompleteLesson(testPath(), lessonMap(), snap)).toBeNull();
    expect(getPathProgress(testPath(), lessonMap(), snap)).toEqual({
      lessonsDone: 4,
      lessonsTotal: 4,
      examsPassed: 2,
      examsTotal: 2,
    });
  });
});
