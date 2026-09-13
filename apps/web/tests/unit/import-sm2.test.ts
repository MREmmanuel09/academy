import { describe, expect, it } from 'vitest';
import { sm2ToFsrs, sprintL2FsrsToAcademy } from '../../src/lib/import/sm2-to-fsrs';

describe('sm2ToFsrs', () => {
  const fixedNow = new Date('2026-08-15T12:00:00.000Z');

  it('returns an empty card for null input', () => {
    const { state, warnings } = sm2ToFsrs(null, fixedNow);
    expect(state.state).toBe('new');
    expect(state.due).toBe(fixedNow.toISOString());
    expect(warnings).toContain('missing sm2 state');
  });

  it('returns a fresh card when repetitions is 0 (SM-2 failure reset)', () => {
    const { state, warnings } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      },
      fixedNow,
    );
    expect(state.state).toBe('new');
    expect(warnings).toContain('reset to new (repetitions=0)');
  });

  it('maps interval to scheduled_days', () => {
    const { state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 6 * 86_400_000,
        interval: 6,
        easeFactor: 2.5,
        repetitions: 2,
      },
      fixedNow,
    );
    expect(state.scheduled_days).toBe(6);
    expect(state.reps).toBe(2);
  });

  it('maps ease factor 1.3 (worst) to difficulty 9', () => {
    const { state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: 1.3,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(state.difficulty).toBe(9);
  });

  it('maps ease factor 2.5 (default) to difficulty 5', () => {
    const { state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(state.difficulty).toBe(5);
  });

  it('maps ease factor 3.0+ to easy difficulty', () => {
    const { state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 30 * 86_400_000,
        interval: 30,
        easeFactor: 3.0,
        repetitions: 8,
      },
      fixedNow,
    );
    expect(state.difficulty).toBeLessThanOrEqual(3);
  });

  it('clamps ease factor above 3.5 to 3.5 with warning', () => {
    const { warnings, state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: 5.0,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(warnings.some((w) => w.includes('clamped'))).toBe(true);
    expect(state.difficulty).toBeGreaterThanOrEqual(1);
  });

  it('clamps negative ease factor to 1.3 with warning', () => {
    const { warnings } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: -1,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(warnings.some((w) => w.includes('invalid'))).toBe(true);
  });

  it('clamps NaN interval to 0 with warning', () => {
    const { warnings } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: Number.NaN,
        easeFactor: 2.5,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(warnings.some((w) => w.includes('interval'))).toBe(true);
  });

  it('preserves due date from SM-2 nextReview', () => {
    const due = fixedNow.getTime() + 5 * 86_400_000;
    const { state } = sm2ToFsrs(
      { nextReview: due, interval: 5, easeFactor: 2.5, repetitions: 3 },
      fixedNow,
    );
    expect(new Date(state.due).getTime()).toBe(due);
  });

  it('marks state as review when reps > 0', () => {
    const { state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(state.state).toBe('review');
  });

  it('preserves lapses as 0 (SM-2 does not track this)', () => {
    const { state } = sm2ToFsrs(
      {
        nextReview: fixedNow.getTime() + 86_400_000,
        interval: 1,
        easeFactor: 2.0,
        repetitions: 1,
      },
      fixedNow,
    );
    expect(state.lapses).toBe(0);
  });

  it('derives stability from reps and interval', () => {
    const { state: s1 } = sm2ToFsrs(
      { nextReview: 0, interval: 0, easeFactor: 2.5, repetitions: 1 },
      fixedNow,
    );
    expect(s1.stability).toBe(1);

    const { state: s4 } = sm2ToFsrs(
      { nextReview: 0, interval: 20, easeFactor: 2.5, repetitions: 5 },
      fixedNow,
    );
    expect(s4.stability).toBeGreaterThanOrEqual(20);
  });
});

describe('sprintL2FsrsToAcademy', () => {
  it('maps fields directly', () => {
    const result = sprintL2FsrsToAcademy({
      fsrsState: 'review',
      fsrsDue: '2026-08-22T10:00:00.000Z',
      fsrsStability: 8.4,
      fsrsDifficulty: 4.1,
      fsrsElapsedDays: 3,
      fsrsScheduledDays: 5,
      fsrsReps: 6,
      fsrsLapses: 1,
      fsrsLastReview: '2026-08-17T10:00:00.000Z',
    });
    expect(result.state.state).toBe('review');
    expect(result.state.due).toBe('2026-08-22T10:00:00.000Z');
    expect(result.state.stability).toBe(8.4);
    expect(result.state.difficulty).toBe(4.1);
    expect(result.state.elapsed_days).toBe(3);
    expect(result.state.scheduled_days).toBe(5);
    expect(result.state.reps).toBe(6);
    expect(result.state.lapses).toBe(1);
    expect(result.state.last_review).toBe('2026-08-17T10:00:00.000Z');
  });

  it('clamps unknown state to "new" with warning', () => {
    const { state, warnings } = sprintL2FsrsToAcademy({
      fsrsState: 'weird-state',
      fsrsDue: '2026-08-22T10:00:00.000Z',
      fsrsStability: 1,
      fsrsDifficulty: 5,
      fsrsElapsedDays: 0,
      fsrsScheduledDays: 1,
      fsrsReps: 1,
      fsrsLapses: 0,
      fsrsLastReview: null,
    });
    expect(state.state).toBe('new');
    expect(warnings.some((w) => w.includes('unknown'))).toBe(true);
  });

  it('clamps out-of-range difficulty', () => {
    const { state, warnings } = sprintL2FsrsToAcademy({
      fsrsState: 'review',
      fsrsDue: '2026-08-22T10:00:00.000Z',
      fsrsStability: 1,
      fsrsDifficulty: 99,
      fsrsElapsedDays: 0,
      fsrsScheduledDays: 1,
      fsrsReps: 1,
      fsrsLapses: 0,
      fsrsLastReview: null,
    });
    expect(state.difficulty).toBe(10);
    expect(warnings.some((w) => w.includes('difficulty'))).toBe(true);
  });

  it('falls back when fields are NaN', () => {
    const { state, warnings } = sprintL2FsrsToAcademy({
      fsrsState: 'review',
      fsrsDue: '2026-08-22T10:00:00.000Z',
      fsrsStability: Number.NaN,
      fsrsDifficulty: Number.NaN,
      fsrsElapsedDays: Number.NaN,
      fsrsScheduledDays: Number.NaN,
      fsrsReps: Number.NaN,
      fsrsLapses: Number.NaN,
      fsrsLastReview: null,
    });
    expect(state.stability).toBe(0);
    expect(state.difficulty).toBe(5);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
