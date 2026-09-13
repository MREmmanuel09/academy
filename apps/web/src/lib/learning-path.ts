import { DEFAULT_PASSING_SCORE, type LearningPath, getExamHeader } from '@academy/content';

/**
 * Path gating — pure functions over a learning path + user progress.
 *
 * Rules (single-user, guests bypass via `enforce: false`):
 * - Units are strictly sequential: unit[i] unlocks when every previous
 *   unit is complete AND the previous level's milestone exam is passed.
 * - A unit is complete when all its lessons are complete and all its
 *   exams are passed (best attempt >= passing score).
 * - Lessons inside a unit are strictly sequential: lesson[j] unlocks
 *   when lessons[0..j-1] are complete and the unit itself is unlocked.
 * - Exam thresholds default to the path's `passingScore`, then the
 *   exam JSON, then 80.
 */

export interface ProgressSnapshot {
  /** Completed lesson ids (loader frontmatter ids). */
  completedLessonIds: Set<string>;
  /** Best score per exam id as a 0-1 fraction (only completed attempts). */
  examBest: Record<string, number>;
}

export type UnitStatus =
  | { status: 'complete' }
  | { status: 'available' }
  | { status: 'locked'; blockedByUnit: string | null; missingExams: string[] };

export interface UnitProgress {
  slug: string;
  status: UnitStatus;
  lessonsDone: number;
  lessonsTotal: number;
  examsPassed: number;
  examsTotal: number;
}

export function examThreshold(pathExam: { id: string; passingScore?: number }): number {
  if (typeof pathExam.passingScore === 'number') return pathExam.passingScore;
  return getExamHeader(pathExam.id)?.passingScore ?? DEFAULT_PASSING_SCORE;
}

function isExamPassed(examId: string, required: number, snap: ProgressSnapshot): boolean {
  return (snap.examBest[examId] ?? 0) * 100 >= required;
}

/**
 * Compute per-unit states for a path in order. Pure and total: every
 * unit gets exactly one status.
 */
export function getUnitProgress(
  path: LearningPath,
  lessonIdsByUnit: Map<string, string[]>,
  snap: ProgressSnapshot,
  opts?: { enforce?: boolean },
): UnitProgress[] {
  const enforce = opts?.enforce ?? true;
  const out: UnitProgress[] = [];
  // Nearest preceding incomplete unit: everything after it is locked.
  let nearestIncomplete: string | null = null;
  // Milestone of the previous level gates the whole next level.
  let prevMilestone: { id: string; passingScore?: number } | null = null;

  for (const level of path.levels) {
    for (const pu of level.units) {
      const lessonIds = lessonIdsByUnit.get(pu.unit) ?? [];
      const lessonsDone = lessonIds.filter((id) => snap.completedLessonIds.has(id)).length;
      const exams = pu.exams.map((e) => ({ id: e.id, required: examThreshold(e) }));
      const examsPassed = exams.filter((e) => isExamPassed(e.id, e.required, snap)).length;

      const unitComplete =
        lessonIds.length > 0 && lessonsDone === lessonIds.length && examsPassed === exams.length;

      let status: UnitStatus;
      if (!enforce) {
        status = unitComplete ? { status: 'complete' } : { status: 'available' };
      } else if (unitComplete) {
        status = { status: 'complete' };
      } else if (nearestIncomplete !== null) {
        status = { status: 'locked', blockedByUnit: nearestIncomplete, missingExams: [] };
      } else if (
        prevMilestone &&
        !isExamPassed(prevMilestone.id, examThreshold(prevMilestone), snap)
      ) {
        status = { status: 'locked', blockedByUnit: null, missingExams: [prevMilestone.id] };
      } else {
        status = { status: 'available' };
      }

      out.push({
        slug: pu.unit,
        status,
        lessonsDone,
        lessonsTotal: lessonIds.length,
        examsPassed,
        examsTotal: exams.length,
      });

      if (enforce && !unitComplete && nearestIncomplete === null) {
        nearestIncomplete = pu.unit;
      }
    }
    if (level.milestoneExam) prevMilestone = level.milestoneExam;
  }

  return out;
}

/**
 * Is a lesson unlocked? Requires the unit to be unlocked/complete and
 * every previous lesson in the unit to be complete. Guests (`enforce:
 * false`) can always read.
 */
export function isLessonUnlocked(
  path: LearningPath,
  unitSlug: string,
  lessonId: string,
  lessonIdsByUnit: Map<string, string[]>,
  snap: ProgressSnapshot,
  opts?: { enforce?: boolean },
): boolean {
  if (opts?.enforce === false) return true;
  const states = new Map(
    getUnitProgress(path, lessonIdsByUnit, snap, opts).map((u) => [u.slug, u]),
  );
  const unit = states.get(unitSlug);
  if (!unit || unit.status.status === 'locked') return false;
  const ids = lessonIdsByUnit.get(unitSlug) ?? [];
  const idx = ids.indexOf(lessonId);
  if (idx < 0) return false;
  return ids.slice(0, idx).every((id) => snap.completedLessonIds.has(id));
}

/** First incomplete lesson across the path (continue-learning target). */
export function getFirstIncompleteLesson(
  path: LearningPath,
  lessonIdsByUnit: Map<string, string[]>,
  snap: ProgressSnapshot,
): { unit: string; lessonId: string } | null {
  for (const slug of path.levels.flatMap((l) => l.units.map((u) => u.unit))) {
    for (const id of lessonIdsByUnit.get(slug) ?? []) {
      if (!snap.completedLessonIds.has(id)) return { unit: slug, lessonId: id };
    }
  }
  return null;
}

/** Overall path progress (lessons + exams). */
export function isPathComplete(
  path: LearningPath,
  lessonIdsByUnit: Map<string, string[]>,
  snap: ProgressSnapshot,
): boolean {
  const units = getUnitProgress(path, lessonIdsByUnit, snap);
  if (!units.every((u) => u.status.status === 'complete')) return false;
  for (const level of path.levels) {
    if (
      level.milestoneExam &&
      !isExamPassed(level.milestoneExam.id, examThreshold(level.milestoneExam), snap)
    ) {
      return false;
    }
  }
  return true;
}
export function getPathProgress(
  path: LearningPath,
  lessonIdsByUnit: Map<string, string[]>,
  snap: ProgressSnapshot,
): { lessonsDone: number; lessonsTotal: number; examsPassed: number; examsTotal: number } {
  let lessonsDone = 0;
  let lessonsTotal = 0;
  const examIds = new Set<string>();
  for (const level of path.levels) {
    for (const pu of level.units) {
      const ids = lessonIdsByUnit.get(pu.unit) ?? [];
      lessonsTotal += ids.length;
      lessonsDone += ids.filter((id) => snap.completedLessonIds.has(id)).length;
      for (const e of pu.exams) examIds.add(e.id);
    }
    if (level.milestoneExam) examIds.add(level.milestoneExam.id);
  }
  let examsPassed = 0;
  for (const id of examIds) {
    const ref = { id };
    if (isExamPassed(id, examThreshold(ref), snap)) examsPassed += 1;
  }
  return { lessonsDone, lessonsTotal, examsPassed, examsTotal: examIds.size };
}
