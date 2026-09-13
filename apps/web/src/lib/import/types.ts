/**
 * Canonical import format used by the migration layer.
 *
 * Every parser (RedLab v6, Sprint L2, Academy's own backup) normalises its
 * payload into a `CanonicalImport` shape. The server action then writes
 * rows from this shape — it never has to know the source format.
 *
 * This is also the shape we document for users wanting to import from
 * another tool: write a JSON file matching `CanonicalImport` and the
 * UI will accept it.
 *
 * ## Why a discriminated union
 *
 * The `source` field is required: the migration layer uses it to decide
 * which parsing path to take when a `raw` field is included, and to
 * record provenance in `activity_log` so users can see where each item
 * came from.
 *
 * ## Idempotency
 *
 * The action treats this document as a *snapshot* — re-running with
 * the same document must not duplicate rows. The unique indexes in the
 * DB (`uq_user_lesson`, `uq_user_card`, `uq_user_achievement`) are
 * the source of truth; we use `onConflictDoNothing()` everywhere.
 */

export type ImportSource = 'redlab-v6' | 'sprint-l2' | 'academy';

export interface CanonicalImport {
  /** Source identifier. Drives parsing and provenance. */
  source: ImportSource;
  /** ISO 8601 timestamp of when the source app exported this document. */
  exportedAt: string;
  /** Schema version of the source app. Used for forward-compat checks. */
  sourceVersion: number;

  // ─── Account-level data ──────────────────────────────────────────────
  /** Total XP earned in the source app. */
  totalXp: number;
  /** Current streak (consecutive active days). */
  currentStreak: number;
  /** Longest streak ever recorded in the source app. */
  longestStreak: number;
  /** YYYY-MM-DD in the user's timezone, or null if never active. */
  lastActiveDate: string | null;

  // ─── Lesson progress ─────────────────────────────────────────────────
  /** Lesson IDs the user marked complete. */
  completedLessonIds: string[];
  /** Lab IDs the user completed. */
  completedLabIds: string[];

  // ─── Quiz / exam attempts ───────────────────────────────────────────
  /** Flattened list of quiz and exam attempts. */
  attempts: ImportQuizAttempt[];

  // ─── Achievements ────────────────────────────────────────────────────
  /** Achievement IDs unlocked in the source app, as the user knew them. */
  earnedAchievementIds: string[];
  /** Badge IDs earned (RedLab only). Stored in activity_log. */
  earnedBadgeIds: string[];

  // ─── SRS state ───────────────────────────────────────────────────────
  /** Cards with their original review state, to be converted to FSRS-6. */
  srsCards: ImportSrsCard[];

  // ─── Free-form activity ─────────────────────────────────────────────
  /** Free-form events the user accumulated (roleplays, diagnostics, ...). */
  activity: ImportActivity[];

  // ─── User profile (optional) ─────────────────────────────────────────
  /** Original user profile. We never copy this — Academy keeps its own
   *  account; only the data-derived fields above are migrated. */
  profile?: {
    email?: string;
    name?: string;
    /** IETF tag like "es" or "en". Maps to Academy's preferred_locale. */
    preferredLocale?: string;
    timezone?: string;
  };
}

export type ImportSrsCardSource = 'redlab-sm2' | 'sprint-l2-fsrs';

export interface ImportSrsCard {
  /** "lesson" | "vocab" | "episode" | "quiz" — maps to srs_cards.cardType. */
  cardType: 'lesson' | 'vocab' | 'episode' | 'quiz';
  /** ID of the underlying content in the destination DB. */
  contentId: string;
  /** Where the state came from — drives the converter. */
  source: ImportSrsCardSource;
  /** Original state, opaque to the importer. Parsed by the converter. */
  originalState: unknown;
  /** ISO 8601 — when the user last touched this card, if known. */
  lastReviewedAt: string | null;
}

export interface ImportQuizAttempt {
  /** Stable ID for the quiz/exam in the source app. */
  quizId: string;
  /** "quiz" or "exam" — only used for activity_log provenance. */
  kind: 'quiz' | 'exam';
  /** Score in [0, 1]. */
  score: number;
  /** ISO 8601 of when the attempt finished, if known. */
  completedAt: string | null;
  /** True if the attempt crossed the passing threshold. */
  passed: boolean;
}

export type ImportActivityKind =
  | 'roleplay_session'
  | 'bookmark'
  | 'diagnostic'
  | 'interactive_exercise'
  | 'lab_completed'
  | 'redlab_achievement_unknown'
  | 'sprint_l2_event';

export interface ImportActivity {
  kind: ImportActivityKind;
  /** Free-form payload — preserved for analytics, never parsed. */
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp, if the source app recorded one. */
  at: string | null;
}

/**
 * Result returned by every parser. The action layer converts this into
 * the canonical format and persists it; the UI shows a summary to the
 * user including any warnings.
 */
export interface ParseResult {
  ok: true;
  canonical: CanonicalImport;
  warnings: string[];
}

export interface ParseFailure {
  ok: false;
  /** Machine-readable error code, safe to log. */
  code: 'invalid_json' | 'unsupported_version' | 'missing_field' | 'wrong_shape' | 'too_large';
  /** Human-readable message for the UI. */
  message: string;
  /** Optional detail (parser line, offending field). */
  detail?: string;
}

export type ParseOutcome = ParseResult | ParseFailure;
