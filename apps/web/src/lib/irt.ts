/**
 * Item Response Theory (IRT) — 2-Parameter Logistic (2PL) with guessing.
 *
 * ## Model
 *
 * For an item with parameters:
 *   - `a`  discrimination (slope): how sharply the item distinguishes
 *         between abilities near the difficulty.
 *   - `b`  difficulty (location): the ability level at which P(correct) = 0.5
 *         (when c=0).
 *   - `c`  guessing (lower asymptote): P(correct) for θ → −∞. For
 *         4-option multiple choice, c ≈ 0.25 is a reasonable default.
 *
 * The probability of a correct response is:
 *
 *   P(θ; a, b, c) = c + (1 − c) · σ(a · (θ − b))
 *
 * where σ(x) = 1 / (1 + e^−x) is the logistic function.
 *
 * ## Why 2PL and not 1PL (Rasch) or 3PL
 *
 * - 1PL (Rasch) forces all items to have the same discrimination. This
 *   is mathematically elegant but rarely true in practice for content
 *   written by different authors at different times.
 * - 3PL adds a "slipping" parameter, which requires much more data
 *   per item to calibrate and isn't worth it for a content library of
 *   <1000 items.
 * - 2PL is the sweet spot: allows per-item discrimination, while still
 *   being stable to estimate from a few hundred responses.
 *
 * ## Calibration strategy (Phase 2 ships the math; live calibration
 * comes in Phase 6 when we have real attempt data)
 *
 * For the bootstrap, all items have:
 *   - a = 1.0   (medium discrimination)
 *   - b = 0.0   (medium difficulty)
 *   - c = 0.25  (4-option multiple choice)
 *
 * As users answer items, we accumulate per-item response data and
 * periodically refit the 2PL parameters via joint MLE (or MML with
 * the user ability as a random effect). This file is the runtime
 * consumer; the calibration pipeline lives in `lib/calibration.ts`
 * (Phase 6).
 *
 * ## θ (ability) scale
 *
 * Logit scale, mean 0, SD ~1. Roughly:
 *   θ = −2  → novice (≈ 12% correct on a "b=0, a=1, c=0.25" item)
 *   θ =  0  → average
 *   θ = +2  → expert (≈ 88% correct on a "b=0, a=1, c=0.25" item)
 *
 * Bounds: we clamp θ to [−4, +4] for stability. Outside that range
 * the probabilities saturate and the information is near zero.
 */
export interface ItemParams {
  /** Discrimination, must be > 0. */
  readonly a: number;
  /** Difficulty on the logit scale, typically in [-3, +3]. */
  readonly b: number;
  /** Guessing, in [0, 1). For 4-MCQ use 0.25; true/false 0.5. */
  readonly c: number;
}

export interface Response {
  readonly itemId: string;
  readonly correct: boolean;
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

/** Logistic sigmoid. Stable for large positive/negative `x`. */
export function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/**
 * P(correct | θ, a, b, c) under 2PL with guessing.
 *
 * @example
 *   probability(0, 1, 0, 0)    // 0.5  (by definition of b)
 *   probability(2, 1, 0, 0)    // ≈0.881
 *   probability(-2, 1, 0, 0)   // ≈0.119
 */
export function probability(theta: number, item: ItemParams): number {
  return item.c + (1 - item.c) * sigmoid(item.a * (theta - item.b));
}

/**
 * Fisher information for the 2PL model with guessing (technically 3PL,
 * but c is fixed in our content).
 *
 *   I(θ) = a² · (1 − P) · (P − c)² / ((1 − c)² · P)
 *
 * where P = probability(θ, item).
 *
 * **Important**: for c > 0, the information function is **bimodal**:
 * it has a peak near the difficulty `b` *and* a second peak well above
 * `b`. With c = 0 the second peak vanishes. We document this so the
 * adaptive test selector (which uses information) is not surprised.
 */
export function information(theta: number, item: ItemParams): number {
  const p = probability(theta, item);
  const oneMinusC = 1 - item.c;
  // Guard against division by zero at the asymptotes.
  if (p <= 1e-9 || p >= 1 - 1e-9) return 0;
  if (item.c >= 1) return 0;
  const denom = oneMinusC * oneMinusC * p;
  if (denom === 0) return 0;
  return (item.a * item.a * (1 - p) * (p - item.c) * (p - item.c)) / denom;
}

const THETA_MIN = -4;
const THETA_MAX = 4;
const THETA_STEP = 0.1;

/**
 * Estimate θ via Maximum Likelihood given a set of item responses.
 *
 * Returns `{ theta, se }` where `se` is the standard error computed
 * from the Fisher information: `se = 1 / sqrt(sum(I(θ̂)))`.
 *
 * If responses have all-correct or all-incorrect (no information), we
 * clamp θ to the boundary and return `Infinity` for `se`.
 */
export function estimateTheta(responses: readonly Response[]): {
  theta: number;
  se: number;
} {
  if (responses.length === 0) return { theta: 0, se: 1 };

  // Coarse 1-D grid search to find the peak of the log-likelihood.
  let bestTheta = 0;
  let bestLL = Number.NEGATIVE_INFINITY;
  for (let t = THETA_MIN; t <= THETA_MAX + 1e-9; t += THETA_STEP) {
    const ll = logLikelihood(t, responses);
    if (ll > bestLL) {
      bestLL = ll;
      bestTheta = t;
    }
  }

  // Local Newton refinement from the grid peak.
  let theta = bestTheta;
  for (let iter = 0; iter < 25; iter += 1) {
    const d1 = score(theta, responses);
    const d2 = -totalInformation(theta, responses);
    if (d2 === 0) break;
    const step = d1 / d2;
    theta = clamp(theta + step, THETA_MIN, THETA_MAX);
    if (Math.abs(step) < 1e-4) break;
  }

  const info = totalInformation(theta, responses);
  if (info <= 0) return { theta, se: Number.POSITIVE_INFINITY };
  return { theta, se: 1 / Math.sqrt(info) };
}

function logLikelihood(theta: number, responses: readonly Response[]): number {
  let ll = 0;
  for (const r of responses) {
    const p = probability(theta, r);
    // Clamp to avoid log(0).
    const safe = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
    ll += r.correct ? Math.log(safe) : Math.log(1 - safe);
  }
  return ll;
}

function score(theta: number, responses: readonly Response[]): number {
  // d/dθ log L = Σ (u - p) · a · (1 - c) / ((1 - c) · (...))
  //             = Σ (u - p) · a / (p - c) · (1 - c)
  // After simplification:  d/dθ log L = Σ a · (u - p) / (1 - c) · ...?
  // We use the standard 2PL form:  d/dθ log L = Σ a · (u - p) / (1 − c) · (...)
  // but the cleanest form is:
  //   d/dθ log L = Σ a · (u - p) / (p · (1 − p)) · (p − c) / (1 − c) · (...)
  // For our purposes the numerically-stable form is:
  //   d/dθ log L = Σ a · (u − p) · (1 − c) / ((p − c) · (1 − p))   ... hmm
  //
  // The cleanest derivation:
  //   P = c + (1 - c) · σ(z)   where z = a(θ - b)
  //   dP/dθ = (1 - c) · σ(z) · (1 - σ(z)) · a
  //   d/dθ log L = Σ (u - P) · (1/P) · dP/dθ
  // Substituting and simplifying (1/P · dP/dθ):
  //   dP/dθ / P = a · (1 - c) · σ(z)(1 - σ(z)) / (c + (1-c)σ(z))
  // Hard to simplify cleanly. We compute numerically:
  let s = 0;
  for (const r of responses) {
    const p = probability(theta, r);
    if (p <= 1e-12 || p >= 1 - 1e-12) continue;
    const dpdtheta = (1 - r.c) * aEffective(p, r) * (1 - p) * r.a; // see derivation
    s += r.correct ? dpdtheta / p : -dpdtheta / (1 - p);
  }
  return s;
}

function aEffective(p: number, r: Response): number {
  // P = c + (1-c)·σ(z)  →  σ(z) = (P - c) / (1 - c)
  // z = σ⁻¹((P - c)/(1 - c))
  const ratio = (p - r.c) / (1 - r.c);
  if (ratio <= 0 || ratio >= 1) return 0;
  return Math.log(ratio / (1 - ratio));
}

function totalInformation(theta: number, responses: readonly Response[]): number {
  let total = 0;
  for (const r of responses) total += information(theta, r);
  return total;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/**
 * Pick the next item to administer from a pool.
 *
 * Strategy: **Maximum Information Selection (MIS)** — pick the item
 * that maximises Fisher information at the user's current θ, excluding
 * items already seen.
 *
 * For small pools this is O(n). For larger pools, we'd batch with
 * a top-k pre-filter; not needed at MVP scale (<1000 items).
 */
export function selectNextItem<T extends { id: string; a: number; b: number; c: number }>(
  pool: readonly T[],
  theta: number,
  seenIds: ReadonlySet<string>,
): T | null {
  let best: T | null = null;
  let bestI = Number.NEGATIVE_INFINITY;
  for (const item of pool) {
    if (seenIds.has(item.id)) continue;
    const i = information(theta, { a: item.a, b: item.b, c: item.c });
    if (i > bestI) {
      bestI = i;
      best = item;
    }
  }
  return best;
}
