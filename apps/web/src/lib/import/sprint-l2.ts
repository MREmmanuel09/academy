import type { CanonicalImport, ImportActivity, ImportQuizAttempt, ParseOutcome } from './types';

/**
 * Parser for Sprint L2 user-data exports.
 *
 * The Sprint L2 source app stores user data in a local SQLite DB
 * (`./sprint-l2.db`). Users convert it to JSON via
 * `scripts/sprint-l2-export.ts`, which produces a flat document that
 * this parser consumes.
 *
 * ## Input shape
 *
 *   {
 *     source: 'sprint-l2',
 *     schemaVersion: 1,
 *     exportedAt: ISO,
 *     user: {
 *       id, l1, targetLevel,
 *       currentLevelReading, currentLevelListening,
 *       currentLevelSpeaking, currentLevelWriting,
 *       interests, preferredAccent, planMinutesPerDay,
 *     },
 *     progress: {
 *       currentArc, currentEpisode,
 *       episodesCompleted: string[],   // JSON-encoded in DB; CLI parses it
 *       vocabularySizeReceptive,
 *       vocabularySizeProductive,
 *       lastVltDate, lastCefrTestDate,
 *     },
 *     userCards: [
 *       { cardId, fsrsState, fsrsDue, fsrsStability, fsrsDifficulty,
 *         fsrsElapsedDays, fsrsScheduledDays, fsrsReps, fsrsLapses,
 *         fsrsLastReview },
 *     ],
 *     roleplaySessions: [
 *       { scenarioId, startedAt, endedAt, transcript, feedback },
 *     ],
 *     learningEvents: [
 *       { type, subtype, durationSeconds, result, timestamp },
 *     ],
 *   }
 *
 * ## Mapping
 *
 * - `userCards[]`              → `srsCards[]` (cardType='vocab')
 * - `progress.episodesCompleted` → activity events + srsCards (cardType='episode')
 * - `roleplaySessions[]`       → activity (roleplay_session)
 * - `learningEvents`            → activity (sprint_l2_event), capped at 200
 *
 * We never copy the user's id, name, or email.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (Sprint L2 dumps can include transcripts)
const MAX_EVENTS = 200;

export function parseSprintL2(input: string | unknown): ParseOutcome {
  if (typeof input === 'string') {
    if (input.length > MAX_BYTES) {
      return {
        ok: false,
        code: 'too_large',
        message: `Sprint L2 export exceeds 10 MB (${(input.length / 1024 / 1024).toFixed(1)} MB)`,
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return {
        ok: false,
        code: 'invalid_json',
        message: 'Could not parse Sprint L2 export as JSON.',
        detail: (err as Error).message,
      };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        code: 'wrong_shape',
        message: 'Sprint L2 export must be a JSON object.',
      };
    }
    return parseSprintL2(parsed);
  }

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'wrong_shape',
      message: 'Sprint L2 export must be a JSON object.',
    };
  }
  const root = input as Record<string, unknown>;
  if (root.source !== 'sprint-l2') {
    return {
      ok: false,
      code: 'missing_field',
      message: 'Sprint L2 export must have source="sprint-l2".',
    };
  }
  const schemaVersion = Number(root.schemaVersion);
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1) {
    return {
      ok: false,
      code: 'unsupported_version',
      message: `Sprint L2 export schemaVersion ${schemaVersion} not supported.`,
    };
  }

  const warnings: string[] = [];
  const user = (root.user ?? {}) as Record<string, unknown>;
  const progress = (root.progress ?? {}) as Record<string, unknown>;

  // ─── Profile (l1 → preferredLocale) ────────────────────────────────
  const l1 = typeof user.l1 === 'string' ? user.l1 : 'es';
  const profile: CanonicalImport['profile'] = {
    preferredLocale: l1,
    timezone: undefined,
  };

  // ─── Streaks ──────────────────────────────────────────────────────
  // Sprint L2 didn't track streaks, so we leave them at 0 unless the
  // lastVltDate implies recent activity (best-effort: just store the date).
  const lastVltDate = toDateString(progress.lastVltDate, warnings, 'progress.lastVltDate');
  const lastCefrDate = toDateString(
    progress.lastCefrTestDate,
    warnings,
    'progress.lastCefrTestDate',
  );
  const lastActiveDate = pickMostRecent(lastVltDate, lastCefrDate);

  // ─── Episodes completed ───────────────────────────────────────────
  const episodesRaw = progress.episodesCompleted;
  const episodeIds = parseEpisodesCompleted(episodesRaw, warnings);

  // ─── Cards ────────────────────────────────────────────────────────
  const userCards = toUserCards(root.userCards, warnings);

  // ─── Activity ─────────────────────────────────────────────────────
  const activity: ImportActivity[] = [];
  for (const epId of episodeIds) {
    activity.push({
      kind: 'bookmark', // we treat completed episodes as completed progress
      payload: { episodeId: epId, source: 'sprint-l2' },
      at: null,
    });
  }
  appendRoleplays(root.roleplaySessions, activity, warnings);
  appendLearningEvents(root.learningEvents, activity, warnings);

  // ─── Quiz attempts ────────────────────────────────────────────────
  // Sprint L2 doesn't have quizzes in the same sense as RedLab — it has
  // CEFR tests. We surface those as exam attempts when we find them.
  const attempts: ImportQuizAttempt[] = [];
  if (lastCefrDate) {
    const cefrResult = pickCefrAttempt(user, warnings);
    if (cefrResult) {
      attempts.push({
        quizId: 'sprint-l2:cefr',
        kind: 'exam',
        score: cefrResult,
        completedAt: lastCefrDate,
        passed: cefrResult >= 0.5,
      });
    }
  }

  // ─── Achievements ─────────────────────────────────────────────────
  // Sprint L2 had no achievements table; we don't synthesize any.

  const canonical: CanonicalImport = {
    source: 'sprint-l2',
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : new Date().toISOString(),
    sourceVersion: schemaVersion,
    totalXp: 0, // XP system differs; we don't migrate it.
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate,
    completedLessonIds: [], // Sprint L2 had no concept of lessons.
    completedLabIds: [],
    attempts,
    earnedAchievementIds: [],
    earnedBadgeIds: [],
    srsCards: [
      ...userCards,
      ...episodeIds.map((id) => ({
        cardType: 'episode' as const,
        contentId: id,
        source: 'sprint-l2-fsrs' as const,
        originalState: null,
        lastReviewedAt: null,
      })),
    ],
    activity,
    profile,
  };
  return { ok: true, canonical, warnings };
}

function parseEpisodesCompleted(raw: unknown, warnings: string[]): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    // Stored as JSON-encoded array in the source DB; the CLI script
    // decodes it but a hand-rolled export may not.
    try {
      const decoded = JSON.parse(raw);
      if (Array.isArray(decoded)) {
        return decoded.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      // fall through
    }
    warnings.push('episodesCompleted not a JSON array → []');
    return [];
  }
  warnings.push('episodesCompleted wrong shape → []');
  return [];
}

interface SprintL2Card {
  cardId: string;
  fsrsState: string;
  fsrsDue: string;
  fsrsStability: number;
  fsrsDifficulty: number;
  fsrsElapsedDays: number;
  fsrsScheduledDays: number;
  fsrsReps: number;
  fsrsLapses: number;
  fsrsLastReview: string | null;
}

function toUserCards(raw: unknown, warnings: string[]): CanonicalImport['srsCards'] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    warnings.push('userCards not an array → []');
    return [];
  }
  const out: CanonicalImport['srsCards'] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const card = item as Partial<SprintL2Card>;
    if (typeof card.cardId !== 'string') {
      warnings.push('userCard dropped (no cardId)');
      continue;
    }
    if (typeof card.fsrsDue !== 'string') {
      warnings.push(`userCard ${card.cardId} missing fsrsDue → dropped`);
      continue;
    }
    out.push({
      cardType: 'vocab',
      contentId: card.cardId,
      source: 'sprint-l2-fsrs',
      originalState: {
        fsrsState: card.fsrsState ?? 'new',
        fsrsDue: card.fsrsDue,
        fsrsStability: Number(card.fsrsStability ?? 0),
        fsrsDifficulty: Number(card.fsrsDifficulty ?? 5),
        fsrsElapsedDays: Number(card.fsrsElapsedDays ?? 0),
        fsrsScheduledDays: Number(card.fsrsScheduledDays ?? 0),
        fsrsReps: Number(card.fsrsReps ?? 0),
        fsrsLapses: Number(card.fsrsLapses ?? 0),
        fsrsLastReview: card.fsrsLastReview ?? null,
      },
      lastReviewedAt: card.fsrsLastReview ?? null,
    });
  }
  return out;
}

function appendRoleplays(raw: unknown, out: ImportActivity[], warnings: string[]): void {
  if (raw === null || raw === undefined) return;
  if (!Array.isArray(raw)) {
    warnings.push('roleplaySessions not an array → skipped');
    return;
  }
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const sess = s as { scenarioId?: string; startedAt?: string; endedAt?: string };
    out.push({
      kind: 'roleplay_session',
      payload: {
        scenarioId: sess.scenarioId ?? null,
        startedAt: sess.startedAt ?? null,
        endedAt: sess.endedAt ?? null,
        source: 'sprint-l2',
      },
      at: sess.endedAt ?? sess.startedAt ?? null,
    });
  }
}

function appendLearningEvents(raw: unknown, out: ImportActivity[], warnings: string[]): void {
  if (raw === null || raw === undefined) return;
  if (!Array.isArray(raw)) {
    warnings.push('learningEvents not an array → skipped');
    return;
  }
  const cap = Math.min(raw.length, MAX_EVENTS);
  if (raw.length > cap) {
    warnings.push(`learningEvents truncated ${raw.length} → ${cap}`);
  }
  for (let i = 0; i < cap; i++) {
    const e = raw[i] as { type?: string; timestamp?: string; subtype?: string } | null;
    if (!e) continue;
    out.push({
      kind: 'sprint_l2_event',
      payload: {
        type: e.type ?? null,
        subtype: e.subtype ?? null,
        source: 'sprint-l2',
      },
      at: e.timestamp ?? null,
    });
  }
}

function toDateString(raw: unknown, warnings: string[], field: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') {
    warnings.push(`${field} not a string → null`);
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    warnings.push(`${field} "${raw}" not a date → null`);
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function pickMostRecent(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function pickCefrAttempt(user: Record<string, unknown>, warnings: string[]): number | null {
  // Best-effort: average the four CEFR skill levels as a 0-1 score.
  // Each is documented as a CEFR band (0=A0, 6=C2) in Sprint L2.
  const skills = [
    Number(user.currentLevelReading ?? Number.NaN),
    Number(user.currentLevelListening ?? Number.NaN),
    Number(user.currentLevelSpeaking ?? Number.NaN),
    Number(user.currentLevelWriting ?? Number.NaN),
  ];
  const valid = skills.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  const avg = valid.reduce((s, n) => s + n, 0) / valid.length;
  if (avg < 0) {
    warnings.push('CEFR levels negative → 0');
    return 0;
  }
  // 6 = C2 ≈ mastery; map [0..6] → [0..1].
  return clamp01(avg / 6);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
