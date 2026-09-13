import { parseRedlabV6 } from './redlab';
import { parseSprintL2 } from './sprint-l2';
import type { CanonicalImport, ImportSource, ParseOutcome } from './types';

/**
 * Single entry-point: take any supported source string and route to
 * the right parser. Used by the server action and by tests.
 *
 * Detection order:
 *  1. If JSON has `source: "sprint-l2"` → Sprint L2.
 *  2. If JSON has `version: <number>` and `progress` → RedLab.
 *  3. If JSON has `schemaVersion: 1` and `user` → Academy export.
 *  4. Otherwise: best-effort RedLab (covers hand-rolled exports).
 */
export function parseAny(input: string | unknown): ParseOutcome {
  const parsed = typeof input === 'string' ? safeJson(input) : input;
  if (parsed === undefined) {
    return { ok: false, code: 'invalid_json', message: 'Input is not valid JSON.' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'wrong_shape', message: 'Top-level must be an object.' };
  }
  const root = parsed as Record<string, unknown>;
  if (root.source === 'sprint-l2') {
    return parseSprintL2(parsed);
  }
  if (typeof root.version === 'number' && root.progress) {
    return parseRedlabV6(parsed);
  }
  if (root.schemaVersion === 1 && root.user) {
    return parseAcademyBackup(parsed);
  }
  // Last resort: try RedLab (its format is the most common export).
  return parseRedlabV6(parsed);
}

export function detectSource(input: string | unknown): ImportSource | null {
  const parsed = typeof input === 'string' ? safeJson(input) : input;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const root = parsed as Record<string, unknown>;
  if (root.source === 'sprint-l2') return 'sprint-l2';
  if (root.schemaVersion === 1 && root.user) return 'academy';
  if (typeof root.version === 'number' && root.progress) return 'redlab-v6';
  return null;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/**
 * The Academy export produced by `exportUserDataAction` already matches
 * the canonical shape almost exactly. We map a few renames and pass through.
 */
function parseAcademyBackup(parsed: unknown): ParseOutcome {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'wrong_shape', message: 'Academy export must be an object.' };
  }
  const root = parsed as Record<string, unknown>;
  const streak =
    root.streak && typeof root.streak === 'object' && !Array.isArray(root.streak)
      ? (root.streak as Record<string, unknown>)
      : null;
  const canonical: CanonicalImport = {
    source: 'academy',
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : new Date().toISOString(),
    sourceVersion: 1,
    totalXp: extractNumber(root.xp, 0, 'totalXp'),
    currentStreak: extractNumber(streak?.currentStreak, 0, 'currentStreak'),
    longestStreak: extractNumber(streak?.longestStreak, 0, 'longestStreak'),
    lastActiveDate:
      streak && typeof streak.lastActiveDate === 'string' ? streak.lastActiveDate : null,
    completedLessonIds: toIds(root.progress, 'lessonId'),
    completedLabIds: [],
    attempts: toAttempts(root.quizAttempts),
    earnedAchievementIds: toIds(root.unlocks, 'achievementId'),
    earnedBadgeIds: [],
    srsCards: toSrsCards(root.srsCards),
    activity: [],
  };
  return { ok: true, canonical, warnings: [] };
}

function extractNumber(raw: unknown, fallback: number, _label: string): number {
  if (raw && typeof raw === 'object' && 'totalXp' in raw) {
    return Number((raw as { totalXp: unknown }).totalXp) || fallback;
  }
  return Number(raw) || fallback;
}

function toIds(raw: unknown, idField: string): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((x) => x[idField])
    .filter((x): x is string => typeof x === 'string');
}

function toAttempts(raw: unknown): CanonicalImport['attempts'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((a) => ({
      quizId: typeof a.quizId === 'string' ? a.quizId : 'unknown',
      kind: 'quiz' as const,
      score: clamp01(Number(a.score ?? 0)),
      completedAt: null,
      passed: Number(a.score ?? 0) >= 0.7,
    }));
}

function toSrsCards(raw: unknown): CanonicalImport['srsCards'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .filter((x) => typeof x.contentId === 'string' && typeof x.cardType === 'string')
    .map((x) => ({
      cardType: x.cardType as 'lesson' | 'vocab' | 'episode' | 'quiz',
      contentId: x.contentId as string,
      source: 'sprint-l2-fsrs', // re-import: treat as already-FSRS
      originalState: x.state ?? null,
      lastReviewedAt: typeof x.last_review === 'string' ? x.last_review : null,
    }));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export type {
  CanonicalImport,
  ImportSource,
  ParseOutcome,
  ImportSrsCard,
  ImportQuizAttempt,
  ImportActivity,
  ImportSrsCardSource,
  ImportActivityKind,
} from './types';
export { parseRedlabV6 } from './redlab';
export { parseSprintL2 } from './sprint-l2';
export { sm2ToFsrs, sprintL2FsrsToAcademy } from './sm2-to-fsrs';
