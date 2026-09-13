#!/usr/bin/env -S npx tsx
/**
 * Import RedLab v6 quiz questions to the @academy/db `questions` table.
 *
 * Source: `redlab/src/data/*-quiz*.ts` and `redlab/src/data/quiz-bank.ts`.
 * Target: `questions` table with `quizId` FK to `quizzes`.
 *
 * Also inserts a `quizzes` row for each `exams.json` we have on
 * disk (Fase 3 output).
 *
 * Idempotent: re-running the script doesn't create duplicates.
 * Existing questions are detected by `id` and skipped (or updated
 * if their `prompt`/`options`/`correctAnswer` changed).
 *
 * Usage:
 *   pnpm tsx scripts/import-questions.ts \
 *     --source ../redlab \
 *     --content packages/content/src \
 *     [--dry-run]
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb, type SqliteDb, schema } from '@academy/db';
import { findTopLevelArray, splitTopLevelObjects, readSource } from './redlab/parser.js';
import { parseObject } from './redlab/fields.js';

export interface RawQuestion {
  id: string;
  module?: string;
  difficulty?: string;
  type?: string;
  question: string;
  options?: string[];
  correctAnswer: number | string | boolean;
  explanation?: string;
  xp?: number;
}

interface RawExam {
  id: string;
  title: string;
  description?: string;
  level?: string;
  totalQuestions?: number;
  questionIds: string[];
  passingScore?: number;
  xp?: number;
  prerequisites?: string[];
}

interface ImportReport {
  quizzesInserted: number;
  questionsInserted: number;
  questionsUpdated: number;
  questionsSkipped: number;
  warnings: string[];
}

export interface ImportOptions {
  source: string;
  content: string;
  dryRun?: boolean;
}

export async function importQuestions(opts: ImportOptions): Promise<ImportReport> {
  const sourceDir = resolve(opts.source, 'src', 'data');
  const contentDir = resolve(opts.content);
  const report: ImportReport = {
    quizzesInserted: 0,
    questionsInserted: 0,
    questionsUpdated: 0,
    questionsSkipped: 0,
    warnings: [],
  };

  // 1. Collect every question from the source TS files.
  const questions = collectAllQuestions(sourceDir);
  // 2. Collect every exam from the static content.
  const exams = collectAllExams(contentDir);

  if (opts.dryRun) {
    report.questionsInserted = questions.length;
    return report;
  }

  const db = getDb() as SqliteDb;

  // 3. Insert/update quizzes (one per exam).
  for (const exam of exams) {
    const existing = await db
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.id, exam.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.quizzes).values({
        id: exam.id,
        title: exam.title,
        isAdaptive: true,
        passingScore: (exam.passingScore ?? 70) / 100,
      });
      report.quizzesInserted += 1;
    }
  }

  // 4. Insert/update questions.
  for (const q of questions) {
    const mapped = mapQuestion(q);
    if (!mapped) {
      report.questionsSkipped += 1;
      report.warnings.push(`could not map question ${q.id}`);
      continue;
    }
    // Quiz assignment: prefer the first matching exam, else fall back
    // to a "general practice" quiz that we create on demand. This
    // way questions imported from the source quiz banks (which aren't
    // necessarily tied to one specific exam) are still accessible.
    let owningQuizId = 'practice-general';
    const owningExam = exams.find((e) => e.questionIds.includes(q.id));
    if (owningExam) {
      owningQuizId = owningExam.id;
    } else {
      // Ensure the general quiz exists.
      const gen = await db
        .select()
        .from(schema.quizzes)
        .where(eq(schema.quizzes.id, 'practice-general'))
        .limit(1);
      if (gen.length === 0) {
        await db.insert(schema.quizzes).values({
          id: 'practice-general',
          title: 'General Practice',
          isAdaptive: true,
          passingScore: 0.7,
        });
        report.quizzesInserted += 1;
      }
    }
    const existing = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, q.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.questions).values({
        id: q.id,
        quizId: owningQuizId,
        type: mapped.type,
        prompt: mapped.prompt,
        options: mapped.options,
        correctAnswer: mapped.correctAnswer,
        explanation: mapped.explanation,
        irtA: mapped.irtA,
        irtB: mapped.irtB,
        irtC: mapped.irtC,
        points: q.xp ?? 1,
        order: 0,
      });
      report.questionsInserted += 1;
    } else {
      // Update the fields that may have changed in source. We also
      // re-assign the quiz if the question is now in an exam's
      // questionIds (handles the case where the question was first
      // imported with `practice-general` and later assigned to a
      // specific exam).
      await db
        .update(schema.questions)
        .set({
          quizId: owningQuizId,
          type: mapped.type,
          prompt: mapped.prompt,
          options: mapped.options,
          correctAnswer: mapped.correctAnswer,
          explanation: mapped.explanation,
          irtA: mapped.irtA,
          irtB: mapped.irtB,
          irtC: mapped.irtC,
          points: q.xp ?? 1,
        })
        .where(eq(schema.questions.id, q.id));
      report.questionsUpdated += 1;
    }
  }

  return report;
}

export function collectAllQuestions(sourceDir: string): RawQuestion[] {
  const out: RawQuestion[] = [];
  if (!existsSync(sourceDir)) return out;
  readdirSync(sourceDir);
  const wanted: Array<{ file: string; arrayNames: string[] }> = [
    { file: 'quiz-bank.ts', arrayNames: ['quizBank'] },
    { file: 'devops-quiz.ts', arrayNames: ['devopsQuizBank'] },
    { file: 'devops-quiz-2.ts', arrayNames: ['devopsQuiz2'] },
    { file: 'devops-quiz-3.ts', arrayNames: ['devopsQuiz3', 'devopsQuiz3Extra'] },
    { file: 'python-quiz.ts', arrayNames: ['pythonQuizBank'] },
    { file: 'data-fundamentals-quiz.ts', arrayNames: ['dataQuizBank'] },
    { file: 'data-analysis-quiz.ts', arrayNames: ['dataAnalysisQuiz'] },
    { file: 'bigdata-quiz.ts', arrayNames: ['bigdataQuizBank'] },
  ];
  for (const { file, arrayNames } of wanted) {
    const path = join(sourceDir, file);
    if (!existsSync(path)) continue;
    const src = readSource(path);
    for (const name of arrayNames) {
      const body = findTopLevelArray(src, name);
      if (!body) continue;
      const objs = splitTopLevelObjects(body);
      for (const obj of objs) {
        const parsed = parseObject(obj, [
          'id', 'module', 'difficulty', 'type',
          'question', 'options', 'correctAnswer', 'explanation', 'xp',
        ]) as unknown as RawQuestion;
        if (parsed && typeof parsed.id === 'string' && parsed.id.length > 0) {
          // Cast: parseObject returns plain values; options is a string[].
          if (Array.isArray(parsed.options)) {
            parsed.options = (parsed.options as unknown[]).map(String);
          }
          out.push(parsed);
        }
      }
    }
  }
  return out;
}

function collectAllExams(contentDir: string): RawExam[] {
  const out: RawExam[] = [];
  const examsDir = join(contentDir, 'courses');
  if (!existsSync(examsDir)) return out;
  walk(examsDir, out);
  return out;
}

function walk(dir: string, out: RawExam[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const data = JSON.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
        if (
          Array.isArray(data.questionIds) &&
          typeof data.title === 'string'
        ) {
          // The Fase 3 importer dropped the `id` field from the
          // exam JSONs (it was on the const declaration line, not
          // the body). We recover it from the title as a fallback.
          const id =
            (typeof data.id === 'string' && data.id) ||
            inferExamIdFromTitle(data.title) ||
            `exam-${out.length + 1}`;
          out.push({
            id,
            title: data.title,
            description: typeof data.description === 'string' ? data.description : undefined,
            level: typeof data.level === 'string' ? data.level : undefined,
            totalQuestions:
              typeof data.totalQuestions === 'number' ? data.totalQuestions : undefined,
            questionIds: (data.questionIds as string[]).filter((x) => typeof x === 'string'),
            passingScore:
              typeof data.passingScore === 'number' ? data.passingScore : undefined,
            xp: typeof data.xp === 'number' ? data.xp : undefined,
            prerequisites: Array.isArray(data.prerequisites)
              ? (data.prerequisites as string[])
              : [],
          });
        }
      } catch {
        // skip malformed
      }
    }
  }
}

/** Map an exam title back to its source ID. The Fase 3 importer
 *  stripped the `id` field; this is a hand-curated fallback that
 *  covers the 3 exams we currently have on disk. Add more entries
 *  here as new exams are migrated. */
function inferExamIdFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes('redes básicas') || t.includes('redes basicas')) return 'exam-basic';
  if (t.includes('ccna')) return 'exam-ccna';
  if (t.includes('data analyst')) return 'exam-data-analyst';
  if (t.includes('linux essentials')) return 'exam-linux';
  if (t.includes('docker dca') || t.includes('docker')) return 'exam-docker';
  if (t.includes('kubernetes') || t.includes('ckad')) return 'exam-ckad';
  if (t.includes('aws') || t.includes('cloud practitioner')) return 'exam-aws';
  if (t.includes('sre')) return 'exam-sre';
  if (t.includes('gitops')) return 'exam-gitops';
  if (t.includes('service mesh')) return 'exam-mesh';
  if (t.includes('devsecops')) return 'exam-devsecops';
  if (t.includes('python')) return 'exam-python';
  if (t.includes('big data')) return 'exam-bigdata';
  return null;
}

export interface MappedQuestion {
  type: 'single' | 'multiple' | 'truefalse' | 'short' | 'code';
  prompt: string;
  options: Array<{ id: string; text: string }> | null;
  correctAnswer: string | string[];
  explanation: string;
  irtA: number;
  irtB: number;
  irtC: number;
}

export function mapQuestion(q: RawQuestion): MappedQuestion | null {
  if (!q.question) return null;
  const type = mapType(q.type);
  let options: Array<{ id: string; text: string }> | null = null;
  let correctAnswer: string | string[] = '';

  if (type === 'multiple' || type === 'single') {
    if (!Array.isArray(q.options)) return null;
    options = q.options.map((text, i) => ({ id: String(i), text: String(text) }));
    if (typeof q.correctAnswer === 'number') {
      const idx = q.correctAnswer;
      const opt = options[idx];
      correctAnswer = opt ? opt.id : '';
    } else if (typeof q.correctAnswer === 'string') {
      // Try to find by text.
      const found = options.find((o) => o.text === q.correctAnswer);
      correctAnswer = found?.id ?? '';
    } else {
      correctAnswer = '';
    }
  } else if (type === 'truefalse') {
    correctAnswer = q.correctAnswer === true ? 'true' : 'false';
  } else if (type === 'short') {
    correctAnswer = String(q.correctAnswer);
  }

  // IRT parameters: deterministic from the id hash so MIS picks
  // stable items. Default: a=1, b=0, c=0.25 (4-option multiple choice).
  let h = 0;
  for (let i = 0; i < q.id.length; i += 1) {
    h = (h * 31 + q.id.charCodeAt(i)) | 0;
  }
  const a = 0.8 + (Math.abs(h) % 100) / 250;
  const b = ((Math.abs(h >> 5) % 200) - 100) / 50;
  const c = 0.25;

  return {
    type,
    prompt: q.question,
    options,
    correctAnswer,
    explanation: q.explanation ?? '',
    irtA: a,
    irtB: b,
    irtC: c,
  };
}

export function mapType(t: string | undefined): 'single' | 'multiple' | 'truefalse' | 'short' | 'code' {
  switch (t) {
    case 'multiple':
      return 'multiple';
    case 'truefalse':
      return 'truefalse';
    case 'numeric':
    case 'short':
      return 'short';
    case 'code':
      return 'code';
    default:
      return 'single';
  }
}

// CLI entry point.
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let source = '';
  let content = '';
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--source') {
      source = args[i + 1] ?? '';
      i += 1;
    } else if (a === '--content') {
      content = args[i + 1] ?? '';
      i += 1;
    } else if (a === '--dry-run') {
      dryRun = true;
    }
  }
  if (!source || !content) {
    console.error('Usage: import-questions.ts --source <redlab> --content <content-dir> [--dry-run]');
    process.exit(1);
  }
  const report = await importQuestions({ source, content, dryRun });
  console.log('=== Import report ===');
  console.log(`  quizzes inserted:  ${report.quizzesInserted}`);
  console.log(`  questions inserted: ${report.questionsInserted}`);
  console.log(`  questions updated:  ${report.questionsUpdated}`);
  console.log(`  questions skipped:  ${report.questionsSkipped}`);
  if (report.warnings.length > 0) {
    console.log(`\nWarnings (${report.warnings.length}):`);
    for (const w of report.warnings.slice(0, 20)) console.log(`  ⚠ ${w}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
