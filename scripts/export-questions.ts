#!/usr/bin/env -S npx tsx
/**
 * Export RedLab v6 exams + questions as static JSON content.
 *
 * Source: `redlab/src/data/exams.ts` + `redlab/src/data/*-quiz*.ts`.
 * Target: `packages/content/src/exams/<id>.json` and
 *         `packages/content/src/questions/<id>.json`.
 *
 * The questions are DB-shaped (id, quizId, type, prompt, options,
 * correctAnswer, explanation, irtA/irtB/irtC, points, order) so
 * `pnpm db:seed:content` can import them directly, including IRT
 * parameters computed deterministically from the id hash (stable
 * across machines).
 *
 * Idempotent: the script overwrites its own output; the seed is
 * idempotent via `onConflictDoNothing()`.
 *
 * Usage:
 *   pnpm tsx scripts/export-questions.ts --source ../redlab \
 *     --content packages/content/src [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { mapQuestion, type RawQuestion } from './import-questions.js';
import { parseObject } from './redlab/fields.js';
import { findTopLevelArray, readSource, splitTopLevelObjects } from './redlab/parser.js';

interface ExamUnitMapping {
  course: string;
  unit: string;
}

/** Where each certification exam belongs in the course browser. */
const EXAM_UNIT: Record<string, ExamUnitMapping> = {
  'exam-basic': { course: 'networking', unit: 'fundamentos' },
  'exam-ccna': { course: 'networking', unit: 'switching-routing' },
  'exam-security': { course: 'networking', unit: 'seguridad' },
  'exam-linux': { course: 'devops', unit: 'linux' },
  'exam-docker': { course: 'devops', unit: 'docker' },
  'exam-k8s': { course: 'devops', unit: 'kubernetes' },
  'exam-aws': { course: 'devops', unit: 'multicloud' },
  'exam-sre': { course: 'devops', unit: 'monitoring' },
  'exam-gitops': { course: 'devops', unit: 'advanced' },
  'exam-mesh': { course: 'devops', unit: 'advanced' },
  'exam-devsecops': { course: 'devops', unit: 'advanced' },
  'exam-python-devops': { course: 'python', unit: 'devops' },
  'exam-data-analyst': { course: 'data', unit: 'analysis' },
  'exam-bigdata': { course: 'bigdata', unit: 'bigdata' },
};

interface RawExam {
  id: string;
  title: string;
  description?: string;
  level?: string;
  totalQuestions?: number;
  passingScore?: number;
  xp?: number;
  prerequisites?: string[];
  questionIds: string[];
}

/**
 * Extract `export const examXxx: Exam = { ... }` object literals from
 * exams.ts (each exam is a top-level const, not one array).
 */
function collectExams(sourceDir: string): RawExam[] {  const sourcePath = join(sourceDir, 'exams.ts');
  if (!existsSync(sourcePath)) return [];
  const src = readSource(sourcePath);

  const out: RawExam[] = [];
  const re = /export\s+const\s+([A-Za-z0-9_$]+)\s*:\s*Exam\s*=\s*\{/g;
  const parts = src.split(/\/\*[\s\S]*?\*\//g);
  const code = parts.join(' ');
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const braceStart = code.indexOf('{', match.index);
    if (braceStart < 0) continue;
    // Balanced-brace walk from the opening `{`.
    let depth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let escape = false;
    let end = -1;
    for (let i = braceStart; i < code.length; i += 1) {
      const c = code[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\' && inString) {
        escape = true;
        continue;
      }
      if (inString) {
        if (c === inString) inString = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inString = c;
        continue;
      }
      if (c === '{') {
        depth += 1;
      } else if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) continue;
    const body = code.slice(braceStart, end + 1);
    const parsed = parseObject(body, [
      'id',
      'title',
      'description',
      'level',
      'totalQuestions',
      'durationMinutes',
      'passingScore',
      'xp',
      'questionIds',
      'prerequisites',
    ]) as unknown as RawExam;
    if (parsed && typeof parsed.id === 'string' && parsed.id.length > 0) {
      parsed.questionIds = Array.isArray(parsed.questionIds)
        ? parsed.questionIds.map(String)
        : [];
      parsed.prerequisites = Array.isArray(parsed.prerequisites)
        ? parsed.prerequisites.map(String)
        : [];
      out.push(parsed);
    }
  }
  return out;
}

interface ExportOptions {
  source: string;
  content: string;
  dryRun?: boolean;
}

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
    console.error(
      'Usage: export-questions.ts --source <redlab> --content <content-dir> [--dry-run]',
    );
    process.exit(1);
  }

  const sourceDir = resolve(source, 'src', 'data');
  const contentDir = resolve(content);

  // Collect questions per bank so we can resolve id collisions
  // between banks without losing one of the two questions.
  const bankedQuestions = collectBankQuestions(sourceDir);
  const rawQuestions = bankedQuestions.map(({ bank, question }) => {
    if (bank.includes('devops-quiz-3') && /^q-sec-[1-9]$|^q-sec-10$/.test(question.id)) {
      // devops-quiz-3 reuses `q-sec-*` for DevSecOps questions that
      // collide with the networking security bank (quiz-bank.ts).
      // Remap to q-ds-* so both survive; exams.ts references are
      // fixed below (exam-devsecops uses q-ds-*).
      return { ...question, id: `q-ds-${question.id.replace(/^q-sec-/, '')}` };
    }
    return question;
  });

  // Fix exam references for the remapped DevSecOps questions.
  const rawExams = collectExams(sourceDir);
  for (const exam of rawExams) {
    if (exam.id === 'exam-devsecops') {
      exam.questionIds = exam.questionIds.map((id) =>
        /^q-sec-[1-9]$|^q-sec-10$/.test(id) ? `q-ds-${id.replace(/^q-sec-/, '')}` : id,
      );
    }
  }

  if (dryRun) {
    console.log(`exams: ${rawExams.length} (${rawExams.map((e) => e.id).join(', ')})`);
    console.log(`questions: ${rawQuestions.length}`);
    console.log(`orphan questions (no exam match): ${rawQuestions.length - countOwned(rawQuestions, rawExams)}`);
    return;
  }

  // 1. Exams → content/exams/<id>.json
  const examsDir = join(contentDir, 'exams');
  mkdirSync(examsDir, { recursive: true });
  let examsWritten = 0;
  for (const exam of rawExams) {
    const mapped = EXAM_UNIT[exam.id] ?? { course: 'devops', unit: 'advanced' };
    const payload = {
      id: exam.id,
      course: mapped.course,
      unit: mapped.unit,
      title: exam.title,
      description: exam.description ?? '',
      level: exam.level ?? '',
      totalQuestions: exam.totalQuestions ?? exam.questionIds.length,
      durationMinutes: 0,
      passingScore: exam.passingScore ?? 70,
      xp: exam.xp ?? 100,
      prerequisites: exam.prerequisites ?? [],
      questionIds: exam.questionIds,
    };
    writeFileSync(join(examsDir, `${exam.id}.json`), JSON.stringify(payload, null, 2));
    examsWritten += 1;
  }

  // 2. Questions → content/questions/<id>.json
  const questionsDir = join(contentDir, 'questions');
  mkdirSync(questionsDir, { recursive: true });
  let questionsWritten = 0;
  let questionsSkipped = 0;
  for (const q of rawQuestions) {
    const mapped = mapQuestion(q);
    if (!mapped) {
      questionsSkipped += 1;
      continue;
    }
    const owningExam = rawExams.find((e) => e.questionIds.includes(q.id));
    const payload = {
      id: q.id,
      quizId: owningExam?.id ?? 'practice-general',
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
    };
    writeFileSync(join(questionsDir, `${q.id}.json`), JSON.stringify(payload, null, 2));
    questionsWritten += 1;
  }

  console.log('=== Export report ===');
  console.log(`  exams:     ${examsWritten}`);
  console.log(`  questions: ${questionsWritten}`);
  console.log(`  skipped:   ${questionsSkipped}`);
  console.log(`  out:       ${examsDir}`);
  console.log(`             ${questionsDir}`);
}

function countOwned(questions: RawQuestion[], exams: RawExam[]): number {
  const ids = new Set(exams.flatMap((e) => e.questionIds));
  return questions.filter((q) => ids.has(q.id)).length;
}

const QUESTION_BANKS: Array<{ file: string; names: string[] }> = [
  { file: 'quiz-bank.ts', names: ['quizBank'] },
  { file: 'devops-quiz.ts', names: ['devopsQuizBank'] },
  { file: 'devops-quiz-2.ts', names: ['devopsQuiz2'] },
  { file: 'devops-quiz-3.ts', names: ['devopsQuiz3', 'devopsQuiz3Extra'] },
  { file: 'python-quiz.ts', names: ['pythonQuizBank'] },
  { file: 'data-fundamentals-quiz.ts', names: ['dataQuizBank'] },
  { file: 'data-analysis-quiz.ts', names: ['dataAnalysisQuiz'] },
  { file: 'bigdata-quiz.ts', names: ['bigdataQuizBank'] },
];

interface BankedQuestion {
  bank: string;
  question: RawQuestion;
}

/** Same parsing as import-questions.collectAllQuestions, but keeps the
 *  originating bank file so id collisions can be resolved. */
function collectBankQuestions(sourceDir: string): BankedQuestion[] {
  const out: BankedQuestion[] = [];
  for (const { file, names } of QUESTION_BANKS) {
    const path = join(sourceDir, file);
    if (!existsSync(path)) continue;
    const src = readSource(path);
    for (const name of names) {
      const body = findTopLevelArray(src, name);
      if (!body) continue;
      const objs = splitTopLevelObjects(body);
      for (const obj of objs) {
        const parsed = parseObject(obj, [
          'id',
          'module',
          'difficulty',
          'type',
          'question',
          'options',
          'correctAnswer',
          'explanation',
          'xp',
        ]) as unknown as RawQuestion;
        if (parsed && typeof parsed.id === 'string' && parsed.id.length > 0) {
          if (Array.isArray(parsed.options)) {
            parsed.options = (parsed.options as unknown[]).map(String);
          }
          out.push({ bank: file, question: parsed });
        }
      }
    }
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
