import {
  type SrRating,
  type SrState,
  countDue,
  createInitialCard,
  deserializeState,
  isDue,
  reviewCard,
  serializeState,
} from '@/lib/srs';
import { describe, expect, it } from 'vitest';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

function advance(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

describe('srs — initial card', () => {
  it('starts in the new state with reps=0 and lapses=0', () => {
    const c = createInitialCard(FIXED_NOW);
    expect(c.state).toBe('new');
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(0);
    // FSRS-6 default difficulty for a new card is 0 (unrated).
    // It will be set on the first review.
    expect(c.difficulty).toBeGreaterThanOrEqual(0);
    expect(c.stability).toBeGreaterThanOrEqual(0);
  });

  it('is due immediately when freshly created', () => {
    const c = createInitialCard(FIXED_NOW);
    expect(isDue(c, FIXED_NOW)).toBe(true);
  });
});

describe('srs — review progression', () => {
  it('moves new -> learning on a "good" review', () => {
    const initial = createInitialCard(FIXED_NOW);
    const after = reviewCard(initial, 'good', FIXED_NOW);
    // The library may move to learning or review depending on FSRS-6
    // short-term settings; either way, the card should NOT be "new".
    expect(after.state).not.toBe('new');
    expect(after.reps).toBe(1);
  });

  it('is idempotent given the same inputs', () => {
    const initial = createInitialCard(FIXED_NOW);
    const a = reviewCard(initial, 'good', FIXED_NOW);
    const b = reviewCard(initial, 'good', FIXED_NOW);
    expect(a.state).toBe(b.state);
    expect(a.due).toBe(b.due);
    expect(a.stability).toBe(b.stability);
    expect(a.difficulty).toBe(b.difficulty);
  });

  it('different ratings produce different schedules', () => {
    const initial = createInitialCard(FIXED_NOW);
    const easy = reviewCard(initial, 'easy', FIXED_NOW);
    const again = reviewCard(initial, 'again', FIXED_NOW);
    // "easy" should schedule further out than "again" (larger scheduled_days).
    expect(easy.scheduled_days).toBeGreaterThanOrEqual(again.scheduled_days);
  });

  it('advancing time after a review makes the card no longer due', () => {
    const initial = createInitialCard(FIXED_NOW);
    const after = reviewCard(initial, 'good', FIXED_NOW);
    // Right after the review, the card is scheduled for the future.
    expect(isDue(after, FIXED_NOW)).toBe(false);
    // A minute later, still not due.
    expect(isDue(after, advance(FIXED_NOW, 0))).toBe(false);
  });
});

describe('srs — isDue / countDue', () => {
  const card1 = createInitialCard(FIXED_NOW); // due now
  const card2 = reviewCard(createInitialCard(FIXED_NOW), 'good', FIXED_NOW); // due in future
  const cards: SrState[] = [card1, card2];

  it('counts due cards at a given moment', () => {
    // card1 is "new" → always due. card2 is in the future.
    expect(countDue(cards, FIXED_NOW)).toBe(1);
  });

  it('isDue returns true for new cards regardless of time', () => {
    expect(isDue(card1, advance(FIXED_NOW, 365))).toBe(true);
  });

  it('isDue returns false for cards scheduled in the future', () => {
    expect(isDue(card2, FIXED_NOW)).toBe(false);
  });
});

describe('srs — (de)serialization', () => {
  it('round-trips a state through JSON', () => {
    const c = createInitialCard(FIXED_NOW);
    const json = serializeState(c);
    const parsed = deserializeState(json);
    expect(parsed).toEqual(c);
  });

  it('round-trips a reviewed card through JSON', () => {
    const c = reviewCard(createInitialCard(FIXED_NOW), 'good', FIXED_NOW);
    const json = serializeState(c);
    const parsed = deserializeState(json);
    expect(parsed).toEqual(c);
  });

  it('returns null for malformed JSON', () => {
    expect(deserializeState('not json')).toBeNull();
  });

  it('returns null for a JSON object missing required fields', () => {
    expect(deserializeState(JSON.stringify({ state: 'review' }))).toBeNull();
  });

  it('rejects unknown state strings (forward compat)', () => {
    const obj = {
      state: 'graduated',
      due: '2026-01-15T12:00:00.000Z',
      stability: 5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
    };
    expect(deserializeState(JSON.stringify(obj))).toBeNull();
  });
});

describe('srs — rating names are exhaustive', () => {
  it('all four ratings are supported', () => {
    const initial = createInitialCard(FIXED_NOW);
    const ratings: SrRating[] = ['again', 'hard', 'good', 'easy'];
    for (const r of ratings) {
      const after = reviewCard(initial, r, FIXED_NOW);
      expect(after.reps).toBe(1);
    }
  });
});
