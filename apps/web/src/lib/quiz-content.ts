import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getContentRoot } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq, inArray } from 'drizzle-orm';

/**
 * Quiz/exam content access with graceful degradation:
 * DB (seeded) → global `exams/*.json` + `questions/*.json` →
 * legacy per-unit `<unit>/exams/*.json`.
 *
 * This makes exams runnable in dev (unseeded DB) while production
 * uses the seeded tables. IRT params prefer calibrated values and
 * fall back to deterministic hash params only when nothing exists.
 */

export interface QuizDefinition {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  xp: number;
  questionIds: string[];
  /** Time limit in minutes (0 = 1 minute per question fallback). */
  durationMinutes: number;
  /** Owning course/unit slugs (exam JSON or DB lookup; '' when unknown). */
  course: string;
  unit: string;
}

export interface QuestionDetail {
  id: string;
  prompt: string;
  options: string[];
  correct: string;
  explanation: string;
  a: number;
  b: number;
  c: number;
}

/** Deterministic last-resort IRT params (stable MIS selection). */
export function hashParams(id: string): { a: number; b: number; c: number } {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return {
    a: 0.8 + (Math.abs(h) % 100) / 250,
    b: ((Math.abs(h >> 5) % 200) - 100) / 50,
    c: 0.2 + (Math.abs(h >> 10) % 20) / 100,
  };
}

function readJsonFile<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function definitionFromJson(data: Record<string, unknown>): QuizDefinition | null {
  if (typeof data.id !== 'string' || !Array.isArray(data.questionIds)) return null;
  return {
    id: data.id,
    title: typeof data.title === 'string' ? data.title : data.id,
    description: typeof data.description === 'string' ? data.description : '',
    totalQuestions:
      typeof data.totalQuestions === 'number' ? data.totalQuestions : data.questionIds.length,
    passingScore: typeof data.passingScore === 'number' ? data.passingScore : 80,
    xp: typeof data.xp === 'number' ? data.xp : 0,
    questionIds: data.questionIds.filter((q): q is string => typeof q === 'string'),
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 0,
    course: typeof data.course === 'string' ? data.course : '',
    unit: typeof data.unit === 'string' ? data.unit : '',
  };
}

function detailFromJson(data: Record<string, unknown>): QuestionDetail | null {
  if (typeof data.id !== 'string' || typeof data.prompt !== 'string') return null;
  const type = typeof data.type === 'string' ? data.type : 'multiple';
  // true/false questions store options:null with correctAnswer 'true'|'false'.
  const options: string[] =
    type === 'truefalse'
      ? ['true', 'false']
      : Array.isArray(data.options)
        ? (data.options as Array<{ id?: string; text?: string }>)
            .map((o) => (typeof o.text === 'string' ? o.text : ''))
            .filter((t) => t.length > 0)
        : [];
  const rawCorrect = Array.isArray(data.correctAnswer) ? data.correctAnswer[0] : data.correctAnswer;
  let correct = '';
  if (type === 'truefalse') {
    correct = String(rawCorrect ?? '');
  } else if (typeof rawCorrect === 'string') {
    const opts = Array.isArray(data.options)
      ? (data.options as Array<{ id?: string; text?: string }>)
      : [];
    correct = opts.find((o) => o.id === rawCorrect)?.text ?? rawCorrect;
  }
  const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
  const hashed = hashParams(data.id);
  return {
    id: data.id,
    prompt: data.prompt,
    options,
    correct,
    explanation: typeof data.explanation === 'string' ? data.explanation : '',
    a: num(data.irtA, hashed.a),
    b: num(data.irtB, hashed.b),
    c: num(data.irtC, hashed.c),
  };
}

const examCache = new Map<string, QuizDefinition | null>();
const questionCache = new Map<string, QuestionDetail | null>();

export async function getExamDefinition(examId: string): Promise<QuizDefinition | null> {
  if (examCache.has(examId)) return examCache.get(examId) ?? null;
  let def: QuizDefinition | null = null;

  // 1. Seeded DB (canonical in production). Any DB failure (fresh DB
  // without schema, locked file, …) falls through to the filesystem.
  try {
    const db = getDb() as SqliteDb;
    const [row] = await db
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.id, examId))
      .limit(1);
    if (row) {
      const count = await db
        .select({ c: schema.questions.id })
        .from(schema.questions)
        .where(eq(schema.questions.quizId, examId));
      // Resolve owning course/unit slugs for topic mapping (best effort).
      let course = '';
      let unit = '';
      if (row.unitId) {
        const [u] = await db
          .select({ slug: schema.units.slug, courseId: schema.units.courseId })
          .from(schema.units)
          .where(eq(schema.units.id, row.unitId))
          .limit(1);
        if (u) {
          unit = u.slug;
          const [c] = await db
            .select({ slug: schema.courses.slug })
            .from(schema.courses)
            .where(eq(schema.courses.id, u.courseId))
            .limit(1);
          if (c) course = c.slug;
        }
      }
      def = {
        id: row.id,
        title: row.title,
        description: '',
        totalQuestions: count.length,
        passingScore: Math.round(row.passingScore * 100),
        xp: 0,
        questionIds: count.map((q) => q.c),
        durationMinutes: 0,
        course,
        unit,
      };
    }
  } catch {
    // Fall through to filesystem content below.
  }

  // 2. Global exams/*.json (works unseeded, e.g. dev).
  if (!def) {
    const file = join(getContentRoot(), 'exams', `${examId}.json`);
    if (existsSync(file)) def = definitionFromJson(readJsonFile(file) ?? {});
  }

  // 3. Legacy per-unit <unit>/exams/*.json.
  if (!def) {
    const coursesDir = join(getContentRoot(), 'courses');
    if (existsSync(coursesDir)) {
      outer: for (const course of readdirSync(coursesDir)) {
        const unitsDir = join(coursesDir, course, 'units');
        if (!existsSync(unitsDir) || !statSync(unitsDir).isDirectory()) continue;
        for (const unit of readdirSync(unitsDir)) {
          const examFile = join(unitsDir, unit, 'exams', `${examId}.json`);
          if (existsSync(examFile)) {
            def = definitionFromJson(readJsonFile(examFile) ?? {});
            break outer;
          }
        }
      }
    }
  }

  examCache.set(examId, def);
  return def;
}

export async function getQuestionDetail(questionId: string): Promise<QuestionDetail | null> {
  if (questionCache.has(questionId)) return questionCache.get(questionId) ?? null;
  let detail: QuestionDetail | null = null;

  try {
    const db = getDb() as SqliteDb;
    const [row] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, questionId))
      .limit(1);
    if (row) {
      const opts = (row.options ?? []) as Array<{ id: string; text: string }>;
      const correctId = Array.isArray(row.correctAnswer) ? row.correctAnswer[0] : row.correctAnswer;
      const hashed = hashParams(row.id);
      detail = {
        id: row.id,
        prompt: row.prompt,
        options: opts.map((o) => o.text),
        correct: opts.find((o) => o.id === correctId)?.text ?? String(correctId ?? ''),
        explanation: row.explanation ?? '',
        a: row.irtA ?? hashed.a,
        b: row.irtB ?? hashed.b,
        c: row.irtC ?? hashed.c,
      };
    }
  } catch {
    // Fall through to filesystem content below.
  }

  if (!detail) {
    const file = join(getContentRoot(), 'questions', `${questionId}.json`);
    if (existsSync(file)) detail = detailFromJson(readJsonFile(file) ?? {});
  }

  questionCache.set(questionId, detail);
  return detail;
}

/** Load details for many ids, preserving order and skipping missing. */
export async function getQuestionDetails(ids: readonly string[]): Promise<QuestionDetail[]> {
  const out = new Map<string, QuestionDetail>();

  // Batch DB fetch first (failures fall through to FS per id).
  if (ids.length > 0) {
    try {
      const db = getDb() as SqliteDb;
      const rows = await db
        .select()
        .from(schema.questions)
        .where(inArray(schema.questions.id, ids as string[]));
      for (const row of rows) {
        const opts = (row.options ?? []) as Array<{ id: string; text: string }>;
        const correctId = Array.isArray(row.correctAnswer)
          ? row.correctAnswer[0]
          : row.correctAnswer;
        const hashed = hashParams(row.id);
        out.set(row.id, {
          id: row.id,
          prompt: row.prompt,
          options: opts.map((o) => o.text),
          correct: opts.find((o) => o.id === correctId)?.text ?? String(correctId ?? ''),
          explanation: row.explanation ?? '',
          a: row.irtA ?? hashed.a,
          b: row.irtB ?? hashed.b,
          c: row.irtC ?? hashed.c,
        });
      }
    } catch {
      // Fall through to filesystem content below.
    }
  }

  // FS fallback per missing id (populates the same cache).
  for (const id of ids) {
    if (!out.has(id)) {
      const detail = await getQuestionDetail(id);
      if (detail) out.set(id, detail);
    }
  }

  return ids.map((id) => out.get(id)).filter((d): d is QuestionDetail => d !== undefined);
}
