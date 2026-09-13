import {
  type ItemParams,
  estimateTheta,
  information,
  probability,
  selectNextItem,
  sigmoid,
} from '@/lib/irt';
import { describe, expect, it } from 'vitest';

describe('irt — sigmoid', () => {
  it('is 0.5 at x=0', () => {
    expect(sigmoid(0)).toBe(0.5);
  });
  it('saturates to 1 for very large x', () => {
    expect(sigmoid(50)).toBeCloseTo(1, 12);
  });
  it('saturates to 0 for very negative x', () => {
    expect(sigmoid(-50)).toBeCloseTo(0, 12);
  });
  it('is symmetric: σ(-x) = 1 - σ(x)', () => {
    for (const x of [-3, -1, 0.5, 2, 4]) {
      expect(sigmoid(-x)).toBeCloseTo(1 - sigmoid(x), 12);
    }
  });
});

describe('irt — probability (2PL with guessing)', () => {
  const baseItem: ItemParams = { a: 1, b: 0, c: 0.25 };

  it('returns 0.5 when c=0, a=1, b=0, θ=0 (standard IRT)', () => {
    expect(probability(0, { a: 1, b: 0, c: 0 })).toBe(0.5);
  });

  it('returns c when θ → -∞ (guessing floor)', () => {
    expect(probability(-100, baseItem)).toBeCloseTo(0.25, 6);
  });

  it('returns 1 when θ → +∞', () => {
    expect(probability(100, baseItem)).toBeCloseTo(1, 6);
  });

  it('higher ability → higher probability (monotone)', () => {
    const p1 = probability(-2, baseItem);
    const p2 = probability(0, baseItem);
    const p3 = probability(2, baseItem);
    expect(p1).toBeLessThan(p2);
    expect(p2).toBeLessThan(p3);
  });

  it('higher discrimination → steeper curve at the difficulty', () => {
    // At the difficulty (θ = b), the slope is a/4. So a=2 should give
    // P(0.1) much closer to 0.5 than a=0.5 does.
    const nearB_a2 = probability(0.1, { a: 2, b: 0, c: 0 });
    const nearB_a05 = probability(0.1, { a: 0.5, b: 0, c: 0 });
    expect(nearB_a2).toBeGreaterThan(nearB_a05);
  });

  it('shifts the curve with b', () => {
    // P(θ = b) = (1 + c) / 2 for c=0.25 → 0.625.
    expect(probability(0, { a: 1, b: 0, c: 0.25 })).toBeCloseTo(0.625, 6);
    expect(probability(1, { a: 1, b: 1, c: 0.25 })).toBeCloseTo(0.625, 6);
  });
});

describe('irt — information', () => {
  it('is positive at the item difficulty', () => {
    const item: ItemParams = { a: 1, b: 0.5, c: 0.25 };
    expect(information(0.5, item)).toBeGreaterThan(0);
  });

  it('is zero at the asymptotes', () => {
    const item: ItemParams = { a: 1, b: 0, c: 0.25 };
    expect(information(-100, item)).toBe(0);
    expect(information(100, item)).toBe(0);
  });

  it('grows quadratically with discrimination a (c=0 case)', () => {
    // For c=0 (no guessing), I ∝ a². We test with c=0 to avoid the
    // bimodal second-peak effect that c>0 introduces.
    const atLowA = information(0, { a: 1, b: 0, c: 0 });
    const atHighA = information(0, { a: 2, b: 0, c: 0 });
    expect(atHighA / atLowA).toBeCloseTo(4, 1);
  });

  it('is unimodal for c=0 (peaks at b)', () => {
    const item: ItemParams = { a: 1, b: 0.5, c: 0 };
    const atB = information(0.5, item);
    const far = information(0.5 + 3, item);
    expect(atB).toBeGreaterThan(far);
  });
});

describe('irt — estimateTheta', () => {
  it('returns default θ=0 for no responses', () => {
    expect(estimateTheta([])).toEqual({ theta: 0, se: 1 });
  });

  it('estimates positive θ for all-correct on hard items', () => {
    // 10 hard items (b=2) all correct → θ should be high.
    const responses = Array.from({ length: 10 }, () => ({
      itemId: 'q1',
      correct: true,
      a: 1,
      b: 2,
      c: 0.25,
    }));
    const { theta } = estimateTheta(responses);
    expect(theta).toBeGreaterThan(1.5);
  });

  it('estimates negative θ for all-incorrect on easy items', () => {
    const responses = Array.from({ length: 10 }, () => ({
      itemId: 'q1',
      correct: false,
      a: 1,
      b: -2,
      c: 0.25,
    }));
    const { theta } = estimateTheta(responses);
    expect(theta).toBeLessThan(-1.5);
  });

  it('estimates θ ≈ b for a mixed pattern (recovered parameter)', () => {
    // ~50% correct on items of difficulty b=0.5 → θ should land near 0.5.
    const responses = Array.from({ length: 20 }, (_, i) => ({
      itemId: `q${i}`,
      correct: i < 11, // 11/20 correct
      a: 1,
      b: 0.5,
      c: 0.25,
    }));
    const { theta } = estimateTheta(responses);
    expect(theta).toBeGreaterThan(0.0);
    expect(theta).toBeLessThan(1.5);
  });

  it('returns smaller SE with more responses', () => {
    const small = Array.from({ length: 4 }, (_, i) => ({
      itemId: `q${i}`,
      correct: true,
      a: 1,
      b: 0,
      c: 0.25,
    }));
    const big = Array.from({ length: 40 }, (_, i) => ({
      itemId: `q${i}`,
      correct: true,
      a: 1,
      b: 0,
      c: 0.25,
    }));
    const smallEst = estimateTheta(small);
    const bigEst = estimateTheta(big);
    expect(bigEst.se).toBeLessThan(smallEst.se);
  });

  it('clamps θ to the [−4, +4] bound', () => {
    // All correct on impossibly hard items → should saturate at +4.
    const responses = Array.from({ length: 50 }, () => ({
      itemId: 'q',
      correct: true,
      a: 1,
      b: 3,
      c: 0.25,
    }));
    const { theta } = estimateTheta(responses);
    expect(theta).toBeLessThanOrEqual(4);
    expect(theta).toBeGreaterThanOrEqual(-4);
  });
});

describe('irt — selectNextItem', () => {
  const pool = [
    { id: 'easy', a: 1, b: -2, c: 0.25 },
    { id: 'medium', a: 1, b: 0, c: 0.25 },
    { id: 'hard', a: 1, b: 2, c: 0.25 },
  ];

  it('picks the item closest to the user ability', () => {
    const next = selectNextItem(pool, 0, new Set());
    expect(next?.id).toBe('medium');
  });

  it('shifts toward harder items as θ grows', () => {
    const next = selectNextItem(pool, 2, new Set());
    expect(next?.id).toBe('hard');
  });

  it('shifts toward easier items as θ drops', () => {
    const next = selectNextItem(pool, -2, new Set());
    expect(next?.id).toBe('easy');
  });

  it('skips items already in the seen set', () => {
    const next = selectNextItem(pool, 0, new Set(['medium']));
    expect(next?.id).not.toBe('medium');
  });

  it('returns null when every item has been seen', () => {
    expect(selectNextItem(pool, 0, new Set(['easy', 'medium', 'hard']))).toBeNull();
  });
});
