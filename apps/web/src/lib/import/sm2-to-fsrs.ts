import type { SrState } from '../srs';

/**
 * RedLab v6 used the SM-2 algorithm for spaced repetition, with these
 * fields per card:
 *
 *   nextReview: number  // epoch ms
 *   interval:    number  // days until next review
 *   easeFactor:  number  // 1.3..2.5+
 *   repetitions: number  // successful reviews in a row
 *
 * Academy uses FSRS-6. We don't replay every review event — we just
 * snap a single SrState that approximately matches the user's SM-2
 * maturity. Good enough to:
 *   - Preserve due dates (so reviews due today still show up).
 *   - Preserve repetitions / lapses (so a power user isn't reset to zero).
 *   - Avoid pathological FSRS states (stability 0, difficulty 10).
 *
 * The conversion is *approximate*; the next review will refine the
 * state via the real FSRS scheduler.
 *
 * ## Mapping
 *
 * - `interval`       → `scheduled_days` (same)
 * - `repetitions`    → `reps` (same)
 * - easeFactor 1.3    → FSRS difficulty 9 (hard)
 * - easeFactor 2.5    → FSRS difficulty 5 (average)
 * - easeFactor >2.5   → FSRS difficulty 3 (easy)
 * - stability is derived from repetitions:
 *     reps 0       → 0.5 days
 *     reps 1       → 1 day
 *     reps 2-3     → interval days
 *     reps 4+      → max(interval * 1.2, 7)
 * - lapses is 0 (SM-2 doesn't have an explicit lapse counter in RedLab;
 *   we infer it from a low ease factor and a reset to repetitions=0,
 *   but those signals are lost in the export, so we leave it 0).
 */

export interface Sm2Review {
  nextReview: number; // epoch ms
  interval: number; // days
  easeFactor: number;
  repetitions: number;
}

/** Incoming payload, before validation. Loose typing for the parser. */
export type Sm2ReviewLike = Partial<Sm2Review> | null | undefined;

export interface ConvertResult {
  state: SrState;
  warnings: string[];
}

/**
 * Convert a RedLab SM-2 review record into an FSRS-6 SrState.
 *
 * `now` is injectable for tests; production callers pass `new Date()`.
 *
 * Returns a `ConvertResult` with any warnings (e.g. malformed input).
 * Never throws — bad data becomes a conservative "new" card.
 */
export function sm2ToFsrs(input: Sm2ReviewLike, now: Date = new Date()): ConvertResult {
  const warnings: string[] = [];
  if (input === null || input === undefined) {
    return { state: emptyCard(now), warnings: ['missing sm2 state'] };
  }
  const r = sanitize(input, warnings);
  if (r.repetitions <= 0) {
    // SM-2 resets on failure; we map that to a fresh FSRS card.
    return {
      state: emptyCard(now),
      warnings: [...warnings, 'reset to new (repetitions=0)'],
    };
  }

  const due = new Date(r.nextReview);
  if (Number.isNaN(due.getTime())) {
    warnings.push('nextReview invalid → due=now');
    due.setTime(now.getTime());
  }

  const difficulty = easeToDifficulty(r.easeFactor);
  const stability = deriveStability(r);
  const elapsedDays = computeElapsedDays(r.nextReview, r.interval, now);

  const state: SrState = {
    state: 'review',
    due: due.toISOString(),
    stability,
    difficulty,
    elapsed_days: Math.max(0, Math.round(elapsedDays)),
    scheduled_days: Math.max(0, Math.round(r.interval)),
    reps: Math.max(0, Math.round(r.repetitions)),
    lapses: 0,
  };
  if (!Number.isNaN(r.nextReview) && r.nextReview > 0) {
    // best-effort: the last review was one interval before the next.
    const last = new Date(r.nextReview - r.interval * 86_400_000);
    if (!Number.isNaN(last.getTime()) && last.getTime() <= now.getTime()) {
      state.last_review = last.toISOString();
    }
  }
  return { state, warnings };
}

function sanitize(input: Sm2ReviewLike, warnings: string[]): Sm2Review {
  const r: Sm2Review = {
    nextReview: Number(input?.nextReview ?? 0),
    interval: Number(input?.interval ?? 0),
    easeFactor: Number(input?.easeFactor ?? 2.5),
    repetitions: Number(input?.repetitions ?? 0),
  };
  if (!Number.isFinite(r.nextReview)) {
    warnings.push('nextReview NaN → 0');
    r.nextReview = 0;
  }
  if (!Number.isFinite(r.interval) || r.interval < 0) {
    warnings.push(`interval invalid (${r.interval}) → 0`);
    r.interval = 0;
  }
  if (!Number.isFinite(r.easeFactor) || r.easeFactor < 1.3) {
    warnings.push(`easeFactor invalid (${r.easeFactor}) → 1.3`);
    r.easeFactor = 1.3;
  }
  if (r.easeFactor > 3.5) {
    warnings.push(`easeFactor ${r.easeFactor} clamped → 3.5`);
    r.easeFactor = 3.5;
  }
  if (!Number.isFinite(r.repetitions) || r.repetitions < 0) {
    warnings.push(`repetitions invalid (${r.repetitions}) → 0`);
    r.repetitions = 0;
  }
  return r;
}

function easeToDifficulty(ef: number): number {
  // Clamp to FSRS range (1..10). ef=1.3 (worst) → 9, ef=2.5 (default) → 5,
  // ef=3.0+ (best) → 3. Linear in between.
  if (ef <= 1.3) return 9;
  if (ef >= 2.5) {
    const over = ef - 2.5;
    return Math.max(1, Math.round(5 - over * 4));
  }
  const t = (ef - 1.3) / (2.5 - 1.3);
  return Math.round(9 - t * 4);
}

function deriveStability(r: Sm2Review): number {
  if (r.repetitions <= 0) return 0.5;
  if (r.repetitions === 1) return 1;
  if (r.repetitions <= 3) return Math.max(1, r.interval);
  return Math.max(r.interval * 1.2, 7);
}

function computeElapsedDays(nextReview: number, interval: number, now: Date): number {
  if (!nextReview) return 0;
  const lastReview = nextReview - interval * 86_400_000;
  const elapsedMs = now.getTime() - lastReview;
  if (elapsedMs <= 0) return 0;
  return elapsedMs / 86_400_000;
}

function emptyCard(now: Date): SrState {
  return {
    state: 'new',
    due: now.toISOString(),
    stability: 0,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
  };
}

/**
 * Convert a Sprint L2 `user_cards.fsrs_*` set of columns into a
 * SrState. Sprint L2 already used FSRS (since 0.4) so this is a
 * direct field copy with normalisation.
 */
export interface SprintL2FsrsFields {
  fsrsState: string; // JSON-encoded state in newer versions
  fsrsDue: string; // ISO 8601
  fsrsStability: number;
  fsrsDifficulty: number;
  fsrsElapsedDays: number;
  fsrsScheduledDays: number;
  fsrsReps: number;
  fsrsLapses: number;
  fsrsLastReview: string | null;
}

export function sprintL2FsrsToAcademy(input: SprintL2FsrsFields): ConvertResult {
  const warnings: string[] = [];
  const state: SrState = {
    state: clampState(input.fsrsState, warnings),
    due: input.fsrsDue,
    stability: clampNumber(input.fsrsStability, 0, 365, 0, warnings, 'stability'),
    difficulty: clampNumber(input.fsrsDifficulty, 1, 10, 5, warnings, 'difficulty'),
    elapsed_days: clampNumber(input.fsrsElapsedDays, 0, 3650, 0, warnings, 'elapsed_days'),
    scheduled_days: clampNumber(input.fsrsScheduledDays, 0, 365, 0, warnings, 'scheduled_days'),
    reps: clampNumber(input.fsrsReps, 0, 100_000, 0, warnings, 'reps'),
    lapses: clampNumber(input.fsrsLapses, 0, 100_000, 0, warnings, 'lapses'),
  };
  if (input.fsrsLastReview) {
    state.last_review = input.fsrsLastReview;
  }
  return { state, warnings };
}

function clampState(raw: string, warnings: string[]): SrState['state'] {
  if (raw === 'new' || raw === 'learning' || raw === 'review' || raw === 'relearning') {
    return raw;
  }
  warnings.push(`fsrsState "${raw}" unknown → "new"`);
  return 'new';
}

function clampNumber(
  n: number,
  min: number,
  max: number,
  fallback: number,
  warnings: string[],
  label: string,
): number {
  if (!Number.isFinite(n)) {
    warnings.push(`${label} not finite → ${fallback}`);
    return fallback;
  }
  if (n < min) {
    warnings.push(`${label} ${n} < min → ${min}`);
    return min;
  }
  if (n > max) {
    warnings.push(`${label} ${n} > max → ${max}`);
    return max;
  }
  return n;
}
