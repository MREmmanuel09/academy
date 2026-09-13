/**
 * Bayesian Knowledge Tracing (BKT) — per-topic mastery P(known).
 *
 * Each quiz answer updates the topic's mastery:
 *  - correct:   P(L|✓) = P(L)(1−slip) / [P(L)(1−slip) + (1−P(L))·guess]
 *  - incorrect: P(L|✗) = P(L)·slip   / [P(L)·slip + (1−P(L))(1−guess)]
 * then learning transit: P(L) += (1 − P(L)) · transit.
 *
 * Pure functions — trivially unit-testable. The server persists the
 * result in `user_skill_mastery`.
 */

export interface BktParams {
  slip: number;
  guess: number;
  transit: number;
}

export const DEFAULT_BKT: BktParams = {
  slip: 0.1,
  guess: 0.25,
  transit: 0.15,
};

export const INITIAL_MASTERY = 0.3;

/** Clamp to [0, 1] (guards against float drift). */
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function bktUpdate(
  prior: number,
  correct: boolean,
  params: BktParams = DEFAULT_BKT,
): number {
  const p = clamp01(prior);
  const { slip, guess, transit } = params;
  let posterior: number;
  if (correct) {
    const denom = p * (1 - slip) + (1 - p) * guess;
    posterior = denom === 0 ? p : (p * (1 - slip)) / denom;
  } else {
    const denom = p * slip + (1 - p) * (1 - guess);
    posterior = denom === 0 ? p : (p * slip) / denom;
  }
  return clamp01(posterior + (1 - posterior) * transit);
}

/** Topic key for a course/unit pair, e.g. `devops/linux`. */
export function topicKey(courseSlug: string, unitSlug: string): string {
  return `${courseSlug}/${unitSlug}`;
}

/** Human bucket for heatmap colors and labels. */
export function masteryBucket(mastery: number): 'weak' | 'developing' | 'strong' | 'mastered' {
  if (mastery >= 0.85) return 'mastered';
  if (mastery >= 0.6) return 'strong';
  if (mastery >= 0.4) return 'developing';
  return 'weak';
}
