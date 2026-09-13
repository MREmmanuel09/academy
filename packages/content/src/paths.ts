import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getContentRoot, loadCourse } from './loader.js';

/**
 * Learning paths — the "camino correcto" through a course.
 *
 * A path groups a course's units into ordered levels (Fundamentos →
 * Profesional), declares measurable objectives per unit, and wires unit
 * + milestone exams with passing thresholds. Units are strictly
 * sequential: unit[i] unlocks when unit[i-1] is complete (all lessons
 * + its exams passed). Levels are sequential the same way.
 */

export interface PathExamRef {
  /** Exam id, e.g. `exam-ccna` (see `exams/*.json`). */
  id: string;
  /** Required score in percent (0-100). Defaults to 80 when omitted. */
  passingScore?: number;
}

export interface PathUnit {
  /** Unit slug within the course. */
  unit: string;
  /** Measurable learning objectives shown on the unit page. */
  objectives: string[];
  /** Exams that gate this unit (all must be passed). */
  exams: PathExamRef[];
}

export interface PathLevel {
  id: string;
  title: string;
  description: string;
  units: PathUnit[];
  /** Final gate of the level (may duplicate a unit exam). */
  milestoneExam?: PathExamRef;
}

export interface LearningPath {
  id: string;
  course: string;
  title: string;
  description: string;
  /** External certification this path prepares for, e.g. `Cisco CCNA 200-301`. */
  externalExam: string;
  levels: PathLevel[];
}

export const DEFAULT_PASSING_SCORE = 80;

interface ExamHeader {
  id: string;
  course: string;
  unit: string;
  passingScore: number;
  prerequisites: string[];
}

/** Public read of an exam header (passing score + prerequisites). */
export function getExamHeader(examId: string): ExamHeader | null {
  return readExamHeader(getContentRoot(), examId);
}

function readExamHeader(root: string, examId: string): ExamHeader | null {
  const file = join(root, 'exams', `${examId}.json`);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    if (typeof data.id !== 'string') return null;
    const prereqs = Array.isArray(data.prerequisites)
      ? data.prerequisites.filter((p): p is string => typeof p === 'string')
      : [];
    return {
      id: data.id,
      course: typeof data.course === 'string' ? data.course : '',
      unit: typeof data.unit === 'string' ? data.unit : '',
      passingScore:
        typeof data.passingScore === 'number' ? data.passingScore : DEFAULT_PASSING_SCORE,
      prerequisites: prereqs,
    };
  } catch {
    return null;
  }
}

function readPathFile(root: string, file: string): LearningPath | null {
  try {
    const data = JSON.parse(readFileSync(join(root, 'paths', file), 'utf8')) as LearningPath;
    if (!data || typeof data.id !== 'string' || !Array.isArray(data.levels)) return null;
    return data;
  } catch {
    return null;
  }
}

/** List all learning-path ids (filenames without extension). */
export function listPaths(): string[] {
  const root = getContentRoot();
  const dir = join(root, 'paths');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

/** Load a path by id, or null when missing/invalid JSON. */
export function loadPath(id: string): LearningPath | null {
  return readPathFile(getContentRoot(), `${id}.json`);
}

/** Find the path for a course slug, or null when the course has none. */
export function getPathForCourse(courseSlug: string): LearningPath | null {
  for (const id of listPaths()) {
    const path = loadPath(id);
    if (path && path.course === courseSlug) return path;
  }
  return null;
}

/** Flattened unit slugs in path order. */
export function pathUnitOrder(path: LearningPath): string[] {
  return path.levels.flatMap((l) => l.units.map((u) => u.unit));
}

/**
 * Validate a learning path against the loaded course content.
 * Returns a list of human-readable errors; empty means valid.
 *
 * Checks:
 * - course exists; every referenced unit exists, exactly once
 * - every course unit is covered (no orphan lessons outside the path)
 * - every referenced exam exists, belongs to this course, and its
 *   exam-level prerequisites are also in the path *before* it
 * - levels and units are non-empty; objectives non-empty
 */
export function validatePath(path: LearningPath): string[] {
  const errors: string[] = [];
  const root = getContentRoot();

  const course = loadCourse(path.course);
  if (!course) {
    errors.push(`unknown course '${path.course}'`);
    return errors;
  }
  const unitBySlug = new Map(course.units.map((u) => [u.slug, u]));

  if (path.levels.length === 0) errors.push('path has no levels');

  const seenUnits = new Map<string, number>(); // slug -> position
  const seenExams = new Map<string, number>(); // exam id -> position
  let position = 0;

  path.levels.forEach((level, li) => {
    if (level.units.length === 0) {
      errors.push(`level '${level.id}' (index ${li}) has no units`);
    }
    const checkExam = (ref: PathExamRef, where: string) => {
      const header = readExamHeader(root, ref.id);
      if (!header) {
        errors.push(`${where}: unknown exam '${ref.id}'`);
        return;
      }
      if (header.course !== path.course) {
        errors.push(
          `${where}: exam '${ref.id}' belongs to course '${header.course}', not '${path.course}'`,
        );
      }
      for (const pre of header.prerequisites) {
        if (!seenExams.has(pre)) {
          errors.push(
            `${where}: exam '${ref.id}' requires '${pre}' which is not passed earlier in the path`,
          );
        }
      }
      if (!seenExams.has(ref.id)) seenExams.set(ref.id, position);
    };

    for (const pu of level.units) {
      position += 1;
      if (!unitBySlug.has(pu.unit)) {
        errors.push(`level '${level.id}': unknown unit '${pu.unit}'`);
        continue;
      }
      if (seenUnits.has(pu.unit)) {
        errors.push(`unit '${pu.unit}' appears twice in the path`);
        continue;
      }
      seenUnits.set(pu.unit, position);
      if (pu.objectives.length === 0) {
        errors.push(`unit '${pu.unit}' has no objectives`);
      }
      for (const exam of pu.exams) {
        checkExam(exam, `unit '${pu.unit}'`);
      }
    }

    if (level.milestoneExam) {
      checkExam(level.milestoneExam, `milestone of level '${level.id}'`);
    }
  });

  for (const u of course.units) {
    if (!seenUnits.has(u.slug)) {
      errors.push(`course unit '${u.slug}' is not covered by the path`);
    }
  }

  return errors;
}
