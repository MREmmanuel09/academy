/**
 * Gamification primitives — XP, levels, streaks.
 *
 * All functions are **pure** (no DB, no I/O) so they can be unit-tested
 * in isolation. The web layer (server actions, API routes) is
 * responsible for fetching/saving state and calling these.
 *
 * ## XP rules
 *
 *   Lesson completed     +10
 *   Lab completed        +25
 *   Project milestone    +50
 *   Quiz perfect (100%)  +25
 *   Quiz pass (>= 70%)   +10
 *   SRS review           +1
 *   Achievement unlock   per row (variable)
 *   Daily challenge      +30
 *
 * These constants are intentionally small to make level-ups feel
 * frequent early on and slower as users progress.
 *
 * ## Level curve
 *
 * Quadratic: xpForLevel(L) = 50 * L². This is the same shape Anki
 * uses (with a constant of 50) — it gives:
 *   L1 → 0 XP
 *   L2 → 50 XP  (1 lesson + bonus)
 *   L3 → 200 XP (≈ 1 lab)
 *   L5 → 1250 XP
 *   L10 → 5000 XP
 *   L20 → 20000 XP
 *
 * The curve is `xpForLevel(level) - xpForLevel(level - 1)` per level.
 *
 * ## Streaks
 *
 * Streaks count consecutive days (in the user's timezone) with at
 * least one activity_log entry. The DB stores the UTC timestamp;
 * the conversion to local date happens in the **client** (so we
 * don't bake a timezone into the server). The server's job is to
 * store a `lastActiveDate` string ("YYYY-MM-DD" in the user's TZ)
 * and the *current* and *longest* streak counters. See
 * `updateStreak()` for the algorithm.
 *
 * The "today" date passed in MUST be computed in the user's timezone.
 * Use `Intl.DateTimeFormat` on the client to get it; pass the result
 * here as a string. The server never invents a "today" — that's a
 * classic source of off-by-one bugs at midnight.
 */

/** XP awarded per kind of event. */
export const XP_REWARDS = {
  lesson: 10,
  lab: 25,
  projectMilestone: 50,
  quizPerfect: 25,
  quizPass: 10,
  srsReview: 1,
  dailyChallenge: 30,
} as const;

export type XpEventKind = keyof typeof XP_REWARDS;

export const XP_RATE_LIMIT_PER_MINUTE = 20;
/** Default bucket size for any XP event. Anti-spam. */

export const XP_RATE_LIMIT_PER_KIND: Record<XpEventKind, number> = {
  // Lessons and labs go through the default bucket.
  lesson: XP_RATE_LIMIT_PER_MINUTE,
  lab: XP_RATE_LIMIT_PER_MINUTE,
  projectMilestone: XP_RATE_LIMIT_PER_MINUTE,
  // Quizzes: 60/hour-equivalent (1/sec) to be safe for heavy users.
  quizPerfect: 60,
  quizPass: 60,
  // SRS reviews can be done in bulk (e.g. 100 vocab cards in 5 min).
  // Raise the bucket so a focused review session isn't rate-limited.
  srsReview: 200,
  dailyChallenge: XP_RATE_LIMIT_PER_MINUTE,
};
/** Per-event-kind rate limits. SRS in particular gets a higher
 *  bucket so a long review session doesn't trigger the limiter. */

export interface XpEvent {
  kind: XpEventKind;
  /** Optional context, e.g. quiz score for adaptive awards. */
  score?: number;
}

/** Compute XP for a single event. */
export function xpForEvent(event: XpEvent): number {
  // Quiz awards depend on score.
  if (event.kind === 'quizPerfect' || event.kind === 'quizPass') {
    const score = event.score ?? 0;
    if (score >= 1) return XP_REWARDS.quizPerfect;
    if (score >= 0.7) return XP_REWARDS.quizPass;
    return 0;
  }
  return XP_REWARDS[event.kind];
}

/**
 * Apply a batch of XP events to a total, enforcing a per-minute rate
 * limit. The caller is responsible for ordering the events (typically
 * by timestamp) and for handling the "last event at" timestamp.
 *
 * Returns:
 *   - `totalXp`     new XP total
 *   - `gainedXp`    XP actually awarded (may be < sum(xpForEvent) due to spam)
 *   - `dropped`     number of events that were rate-limited away
 */
export function applyXpBatch(
  currentTotal: number,
  events: readonly { event: XpEvent; minutesAgo: number }[],
): { totalXp: number; gainedXp: number; dropped: number } {
  // Bucket events by minute bucket (floor of minutesAgo) AND by kind,
  // so a flood of SRS reviews doesn't drown out lesson completions
  // (or vice versa). Drop events beyond the per-kind bucket size.
  const countsByBucketByKind = new Map<XpEventKind, Map<number, number>>();
  let gained = 0;
  let dropped = 0;
  for (const { event, minutesAgo } of events) {
    const bucket = Math.floor(minutesAgo);
    let byKind = countsByBucketByKind.get(event.kind);
    if (!byKind) {
      byKind = new Map();
      countsByBucketByKind.set(event.kind, byKind);
    }
    const used = byKind.get(bucket) ?? 0;
    const limit = XP_RATE_LIMIT_PER_KIND[event.kind];
    if (used >= limit) {
      dropped += 1;
      continue;
    }
    byKind.set(bucket, used + 1);
    gained += xpForEvent(event);
  }
  return { totalXp: currentTotal + gained, gainedXp: gained, dropped };
}

/** XP threshold to *reach* a given level. Level 1 starts at 0 XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * (level - 1);
}

/** Inverse: given total XP, return the level. */
export function levelFromXp(totalXp: number): number {
  if (totalXp < 0) return 1;
  // Solve L - 1 = sqrt(xp / 50).
  const lMinus1 = Math.sqrt(totalXp / 50);
  return Math.max(1, Math.floor(lMinus1) + 1);
}

/** XP required to go from current level to the next. */
export function xpToNextLevel(totalXp: number): {
  currentLevel: number;
  nextLevel: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
} {
  const currentLevel = levelFromXp(totalXp);
  const nextLevel = currentLevel + 1;
  const currentThreshold = xpForLevel(currentLevel);
  const nextThreshold = xpForLevel(nextLevel);
  return {
    currentLevel,
    nextLevel,
    xpIntoLevel: totalXp - currentThreshold,
    xpNeededForNext: nextThreshold - currentThreshold,
  };
}

/** Streak state (persisted in `user_streaks`). */
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  /** Local date "YYYY-MM-DD" of the most recent activity in the user's TZ. */
  lastActiveDate: string | null;
}

/**
 * Update the streak given the user's current local date and the
 * previous streak state.
 *
 * Rules (designed to match Anki/HeardThat conventions):
 *
 *   - First-ever activity:      currentStreak = 1, lastActiveDate = today
 *   - Same day as last active:  no change (idempotent)
 *   - Next day (today == last+1): currentStreak += 1
 *   - Any later day (>= last+2): currentStreak = 1 (broken)
 *   - future date guard:         if today < lastActiveDate, no change
 *
 * `today` and `lastActiveDate` MUST be in the same timezone.
 */
export function updateStreak(prev: StreakState, today: string): StreakState {
  if (prev.lastActiveDate === null) {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: today };
  }
  if (!isValidDate(today) || !isValidDate(prev.lastActiveDate)) {
    // Defensive: malformed input should not corrupt state.
    return prev;
  }
  if (prev.lastActiveDate === today) {
    return prev; // idempotent
  }
  const diff = dayDiff(prev.lastActiveDate, today);
  if (diff < 0) {
    // Future date — clock skew, ignore.
    return prev;
  }
  if (diff === 1) {
    const next = prev.currentStreak + 1;
    return {
      currentStreak: next,
      longestStreak: Math.max(prev.longestStreak, next),
      lastActiveDate: today,
    };
  }
  // Broken streak.
  return {
    currentStreak: 1,
    longestStreak: prev.longestStreak,
    lastActiveDate: today,
  };
}

/** Stripped-down day diff (in whole days) between two "YYYY-MM-DD" dates. */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
