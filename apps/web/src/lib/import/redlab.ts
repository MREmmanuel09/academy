import type { Sm2ReviewLike } from './sm2-to-fsrs';
import type { CanonicalImport, ImportActivity, ImportQuizAttempt, ParseOutcome } from './types';

/**
 * Parser for RedLab v6 backup files.
 *
 * ## Input shape (defined by `exportProgress()` in redlab/src/store/appStore.ts)
 *
 *   {
 *     version: 6,
 *     exportedAt: ISO,
 *     appVersion: string,
 *     progress: {
 *       completedLessons: string[],
 *       completedLabs:    string[],
 *       quizScores:       Record<id, { score, total, xp }>,
 *       xp:               number,
 *       streak:           number,
 *       lastActive:       'YYYY-MM-DD' | '',
 *     },
 *     examAttempts:        ExamAttempt[],
 *     passedExams:         string[],
 *     earnedBadges:        string[],
 *     earnedAchievements:  string[],
 *     interactiveExercises: Record<lessonId, { completed, bestScore }>,
 *     diagnosticResult:    { level, pct, takenAt } | null,
 *     srsReviews:          Record<lessonId, Sm2Review>,
 *     bookmarks:           string[],
 *   }
 *
 * ## What we never trust
 *
 *   - `email` and any PII beyond display name. The action layer never
 *     writes to `users.email` from an import.
 *   - `appVersion` — informational only, recorded in activity_log.
 *   - Lesson IDs we can't resolve in the destination DB → dropped with
 *     a warning (we never invent rows).
 *
 * ## Errors
 *
 *  - `unsupported_version` if `version` > 6 or missing.
 *  - `wrong_shape` if the root is not an object.
 *  - `missing_field` if `progress` is absent.
 *  - `too_large` if the file is over 5 MB (defensive — RedLab exports
 *    are usually a few KB).
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function parseRedlabV6(input: string | unknown): ParseOutcome {
  if (typeof input === 'string') {
    if (input.length > MAX_BYTES) {
      return {
        ok: false,
        code: 'too_large',
        message: `RedLab export exceeds 5 MB (${(input.length / 1024 / 1024).toFixed(1)} MB)`,
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return {
        ok: false,
        code: 'invalid_json',
        message: 'Could not parse RedLab export as JSON.',
        detail: (err as Error).message,
      };
    }
    // If the result is a non-object, fall through to the object check
    // below so we return `wrong_shape` rather than recursing into a
    // second JSON.parse attempt.
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        code: 'wrong_shape',
        message: 'RedLab export must be a JSON object.',
      };
    }
    return parseRedlabV6(parsed);
  }

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'wrong_shape',
      message: 'RedLab export must be a JSON object.',
    };
  }
  const root = input as Record<string, unknown>;

  const version = Number(root.version);
  if (!Number.isFinite(version) || version < 1) {
    return {
      ok: false,
      code: 'missing_field',
      message: 'RedLab export is missing a "version" field.',
    };
  }
  if (version > 6) {
    return {
      ok: false,
      code: 'unsupported_version',
      message: `RedLab export version ${version} is newer than this importer supports (max v6).`,
    };
  }

  if (!root.progress || typeof root.progress !== 'object') {
    return {
      ok: false,
      code: 'missing_field',
      message: 'RedLab export is missing the "progress" object.',
    };
  }
  const progress = root.progress as Record<string, unknown>;

  const warnings: string[] = [];
  const completedLessonIds = toStringArray(
    progress.completedLessons,
    'progress.completedLessons',
    warnings,
  );
  const completedLabIds = toStringArray(progress.completedLabs, 'progress.completedLabs', warnings);
  const quizScores = parseQuizScores(progress.quizScores, warnings);

  const totalXp = numberOr(progress.xp, 0, warnings, 'progress.xp');
  const currentStreak = numberOr(progress.streak, 0, warnings, 'progress.streak');
  const lastActiveDate = toDateString(progress.lastActive, warnings, 'progress.lastActive');

  // longest streak: RedLab v6 doesn't track it separately, so we
  // conservatively use the current streak. Future versions should
  // override this.
  const longestStreak = currentStreak;

  const examAttempts = toExamAttempts(root.examAttempts, warnings);
  const attempts: ImportQuizAttempt[] = [...quizScores, ...examAttempts];

  const earnedAchievementIds = toStringArray(
    root.earnedAchievements,
    'earnedAchievements',
    warnings,
  );
  const earnedBadgeIds = toStringArray(root.earnedBadges, 'earnedBadges', warnings);

  const srsCards = parseSrsReviews(root.srsReviews, warnings);

  const activity: ImportActivity[] = [];
  // Bookmarks
  const bookmarks = toStringArray(root.bookmarks, 'bookmarks', warnings);
  for (const id of bookmarks) {
    activity.push({ kind: 'bookmark', payload: { contentId: id, source: 'redlab' }, at: null });
  }
  // Interactive exercises
  if (root.interactiveExercises && typeof root.interactiveExercises === 'object') {
    for (const [lessonId, value] of Object.entries(root.interactiveExercises)) {
      const v = value as { completed?: boolean; bestScore?: number } | null;
      if (!v) continue;
      activity.push({
        kind: 'interactive_exercise',
        payload: {
          lessonId,
          completed: v.completed ?? false,
          bestScore: v.bestScore ?? 0,
          source: 'redlab',
        },
        at: null,
      });
    }
  }
  // Labs
  for (const labId of completedLabIds) {
    activity.push({
      kind: 'lab_completed',
      payload: { labId, source: 'redlab' },
      at: null,
    });
  }
  // Diagnostic
  if (root.diagnosticResult && typeof root.diagnosticResult === 'object') {
    const diag = root.diagnosticResult as { level?: string; pct?: number; takenAt?: string };
    activity.push({
      kind: 'diagnostic',
      payload: {
        level: diag.level ?? null,
        pct: diag.pct ?? 0,
        source: 'redlab',
      },
      at: diag.takenAt ?? null,
    });
  }

  const canonical: CanonicalImport = {
    source: 'redlab-v6',
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : new Date().toISOString(),
    sourceVersion: version,
    totalXp,
    currentStreak,
    longestStreak,
    lastActiveDate,
    completedLessonIds,
    completedLabIds,
    attempts,
    earnedAchievementIds,
    earnedBadgeIds,
    srsCards,
    activity,
  };
  if (root.appVersion) {
    canonical.profile = {
      name: typeof root.appVersion === 'string' ? `RedLab v${version}` : undefined,
    };
  }
  return { ok: true, canonical, warnings };
}

// ---------- helpers ----------

function toStringArray(raw: unknown, field: string, warnings: string[]): string[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    warnings.push(`${field} is not an array → []`);
    return [];
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) {
      out.push(item);
    } else if (item !== null && item !== undefined) {
      warnings.push(`${field} dropped non-string item`);
    }
  }
  return out;
}

function numberOr(raw: unknown, fallback: number, warnings: string[], field: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    if (raw !== undefined && raw !== null) {
      warnings.push(`${field} not a number → ${fallback}`);
    }
    return fallback;
  }
  return n;
}

function toDateString(raw: unknown, warnings: string[], field: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') {
    warnings.push(`${field} not a string → null`);
    return null;
  }
  // Expect YYYY-MM-DD; pass through anything that matches.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try parsing ISO timestamp and extracting the date.
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    warnings.push(`${field} "${raw}" not a date → null`);
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function parseQuizScores(raw: unknown, warnings: string[]): ImportQuizAttempt[] {
  if (raw === null || raw === undefined) return [];
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    warnings.push('progress.quizScores not an object → []');
    return [];
  }
  const out: ImportQuizAttempt[] = [];
  for (const [quizId, value] of Object.entries(raw)) {
    const v = value as { score?: number; total?: number; xp?: number } | null;
    if (!v) continue;
    const score = Number(v.score);
    const total = Number(v.total);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
      warnings.push(`quizScores.${quizId} invalid → skipped`);
      continue;
    }
    out.push({
      quizId,
      kind: 'quiz',
      score: clamp01(score / total),
      completedAt: null,
      passed: score / total >= 0.7,
    });
  }
  return out;
}

function toExamAttempts(raw: unknown, warnings: string[]): ImportQuizAttempt[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    warnings.push('examAttempts not an array → []');
    return [];
  }
  const out: ImportQuizAttempt[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') {
      warnings.push('examAttempt dropped (not an object)');
      continue;
    }
    const item = a as {
      examId?: string;
      score?: number;
      total?: number;
      passed?: boolean;
      completedAt?: string;
    };
    if (typeof item.examId !== 'string') {
      warnings.push('examAttempt dropped (no examId)');
      continue;
    }
    const score = Number(item.score ?? 0);
    const total = Number(item.total ?? 0);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
      warnings.push(`examAttempt ${item.examId} invalid score/total → skipped`);
      continue;
    }
    out.push({
      quizId: item.examId,
      kind: 'exam',
      score: clamp01(score / total),
      completedAt: typeof item.completedAt === 'string' ? item.completedAt : null,
      passed: Boolean(item.passed),
    });
  }
  return out;
}

function parseSrsReviews(raw: unknown, warnings: string[]): CanonicalImport['srsCards'] {
  if (raw === null || raw === undefined) return [];
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    warnings.push('srsReviews not an object → []');
    return [];
  }
  const out: CanonicalImport['srsCards'] = [];
  for (const [lessonId, value] of Object.entries(raw)) {
    const v = value as Sm2ReviewLike;
    if (!v) continue;
    const lastReview =
      Number.isFinite(Number(v.nextReview)) && Number(v.nextReview) > 0
        ? new Date(Number(v.nextReview) - Number(v.interval ?? 0) * 86_400_000).toISOString()
        : null;
    out.push({
      cardType: 'lesson',
      contentId: lessonId,
      source: 'redlab-sm2',
      originalState: v,
      lastReviewedAt: lastReview,
    });
  }
  return out;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
