import {
  type Card as FsrsCard,
  Rating,
  type RecordLogItem,
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
} from 'ts-fsrs';

/**
 * Spaced Repetition wrapper around the official `ts-fsrs` library (FSRS-6).
 *
 * ## Why a wrapper
 *
 * The library exposes `Card` and operates on plain JS objects. We:
 *   1. Pin the algorithm version (FSRS-6) and the parameter set so the
 *      behaviour is identical across devices and runs.
 *   2. Wrap the library in a small, typed API that doesn't leak
 *      `ts-fsrs` types into the rest of the app.
 *   3. Provide (de)serialisation helpers so we can store the card
 *      as JSON in the `srs_cards.state` column without lossy casting.
 *
 * ## Idempotency
 *
 * The library is pure: same input card + rating + now → same output card.
 * Calling `reviewCard` twice with the same arguments is a no-op the
 * second time (modulo timestamp precision).
 *
 * ## Time handling
 *
 * All operations are deterministic given a `now: Date`. Tests pass a
 * fixed `now`; production code uses `new Date()`.
 *
 * ## Card type taxonomy (matches `srs_cards.cardType`)
 *
 *   - `lesson`    — spaced-repetition prompts derived from lesson content.
 *   - `vocab`     — Sprint L2 vocabulary (805 words).
 *   - `roleplay`  — re-attempt prompts for roleplay lines.
 *   - `episode`   — comprehension cards for episode audio.
 *   - `quiz`      — failed exam questions enqueued for remediation.
 */
export type SrCardType = 'lesson' | 'vocab' | 'roleplay' | 'episode' | 'quiz';

/** A stable opaque ID for a piece of content being reviewed. */
export interface SrContentRef {
  readonly cardType: SrCardType;
  readonly contentId: string;
}

/** User rating for a card review. */
export type SrRating = 'again' | 'hard' | 'good' | 'easy';

/** Map our rating names onto the library's enum (kept in one place). */
const RATING_MAP = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const satisfies Record<SrRating, Rating>;

/**
 * Persistent shape stored in `srs_cards.state`. We expose only the
 * fields we actually use; `ts-fsrs` may add more over time.
 */
export interface SrState {
  state: 'new' | 'learning' | 'review' | 'relearning';
  /** ISO 8601 due date — *not* a timestamp epoch. */
  due: string;
  /** Memory stability in days (FSRS internal). */
  stability: number;
  /** Difficulty (1=hardest, 10=easiest). */
  difficulty: number;
  /** Days since the last review. */
  elapsed_days: number;
  /** Days scheduled until next review. */
  scheduled_days: number;
  /** Number of successful reviews. */
  reps: number;
  /** Times the card was "lapsed" (forgot after review). */
  lapses: number;
  /** ISO 8601 timestamp of the most recent review. */
  last_review?: string;
}

const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
});

const scheduler = fsrs(params);

/** Build a fresh card (never reviewed) for a piece of content. */
export function createInitialCard(now: Date = new Date()): SrState {
  const card: FsrsCard = createEmptyCard(now);
  return toSrState(card);
}

/**
 * Apply a review to a card and return the updated state plus the
 * full FSRS record log (mostly for analytics; we only need `card`).
 */
export function reviewCard(current: SrState, rating: SrRating, now: Date = new Date()): SrState {
  const card = fromSrState(current);
  const libRating = RATING_MAP[rating];
  const result: RecordLogItem = scheduler.next(card, now, libRating);
  return toSrState(result.card);
}

/** True if the card is due at `now` (or already overdue). */
export function isDue(state: SrState, now: Date = new Date()): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}

/**
 * Count cards that are due at `now`. Cards in `state: 'new'` are always
 * considered due (they've never been reviewed).
 */
export function countDue(states: readonly SrState[], now: Date = new Date()): number {
  let n = 0;
  for (const s of states) {
    if (s.state === 'new' || isDue(s, now)) n += 1;
  }
  return n;
}

/** Serialize a state to JSON. */
export function serializeState(state: SrState): string {
  return JSON.stringify(state);
}

/**
 * Parse a JSON string from the DB into a state. Returns `null` for
 * malformed input (e.g. a row written by a previous schema version).
 * The caller can then decide to re-initialise the card.
 */
export function deserializeState(raw: string): SrState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSrState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------- internal conversions ----------

function toSrState(card: FsrsCard): SrState {
  const state: SrState = {
    state: fsrsStateToString(card.state),
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
  };
  if (card.last_review) {
    return { ...state, last_review: card.last_review.toISOString() };
  }
  return state;
}

function fromSrState(state: SrState): FsrsCard {
  // The library expects Date objects; we round-trip through ISO so the
  // function stays pure and review time is always controlled by the caller.
  return {
    state: stringToFsrsState(state.state),
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  } as FsrsCard;
}

/**
 * ts-fsrs v4 stores card state as a numeric `State` enum. We persist a
 * lowercase string in the DB for human-readable debugging. This adapter
 * is the single point of conversion.
 */
function fsrsStateToString(s: State): SrState['state'] {
  switch (s) {
    case State.New:
      return 'new';
    case State.Learning:
      return 'learning';
    case State.Review:
      return 'review';
    case State.Relearning:
      return 'relearning';
  }
}

function stringToFsrsState(s: SrState['state']): State {
  switch (s) {
    case 'new':
      return State.New;
    case 'learning':
      return State.Learning;
    case 'review':
      return State.Review;
    case 'relearning':
      return State.Relearning;
  }
}

function isSrState(value: unknown): value is SrState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.state === 'string' &&
    ['new', 'learning', 'review', 'relearning'].includes(v.state) &&
    typeof v.due === 'string' &&
    typeof v.stability === 'number' &&
    typeof v.difficulty === 'number' &&
    typeof v.elapsed_days === 'number' &&
    typeof v.scheduled_days === 'number' &&
    typeof v.reps === 'number' &&
    typeof v.lapses === 'number'
  );
}
