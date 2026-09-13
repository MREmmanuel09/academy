/**
 * Calibrate IRT params (a, b, c) for quiz questions from real attempts.
 *
 * Reads completed `user_quiz_attempts.detail` rows ([{questionId,
 * correct}]), estimates per-question difficulty via the smoothed
 * logit of the correct rate, and writes the result back to the DB
 * row AND the source `questions/*.json` file (so reseeds keep it).
 *
 * - a (discrimination): fixed 1.0 (stable default; needs ability
 *   stratification for point-biserial, a future refinement).
 * - b (difficulty): logit with Laplace smoothing, clamped [-3, 3].
 * - c (guessing): 0.25 for 3+ options, 0.5 for true/false.
 *
 * Questions with fewer than --min-attempts (default 30) keep their
 * current (expert) values. --dry-run prints the table without writing.
 *
 * Usage:
 *   pnpm --filter @academy/db db:calibrate [-- --dry-run] [--min-attempts 30]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { type SqliteDb, getDb, schema } from '../client.js';
import { findWorkspaceRoot } from '../workspace.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const minAttemptsArg = args.find((a) => a.startsWith('--min-attempts='));
const MIN_ATTEMPTS = minAttemptsArg
  ? Number.parseInt(minAttemptsArg.split('=')[1] ?? '', 10) || 30
  : 30;

const url = process.env.DATABASE_URL ?? 'file:./apps/web/data/dev.db';
if (!url.startsWith('file:')) {
  console.error('db:calibrate currently supports SQLite (file:) databases only.');
  process.exit(1);
}

const db = getDb() as SqliteDb;

type DetailRow = { questionId: string; correct: boolean };

async function main(): Promise<void> {
  const attempts = await db
    .select({ detail: schema.userQuizAttempts.detail })
    .from(schema.userQuizAttempts);
  const stats = new Map<string, { n: number; correct: number }>();
  for (const row of attempts) {
    const detail = row.detail as DetailRow[] | null;
    if (!Array.isArray(detail)) continue;
    for (const r of detail) {
      if (typeof r?.questionId !== 'string' || typeof r?.correct !== 'boolean') continue;
      const s = stats.get(r.questionId) ?? { n: 0, correct: 0 };
      s.n += 1;
      if (r.correct) s.correct += 1;
      stats.set(r.questionId, s);
    }
  }

  const root = findWorkspaceRoot(process.cwd());
  const questionsDir = join(root, 'packages', 'content', 'src', 'questions');
  let calibrated = 0;
  let skipped = 0;
  // biome-ignore lint/suspicious/noConsoleLog: CLI script, console is the output
  console.log('question | n | p | b | action');
  for (const [questionId, s] of [...stats.entries()].sort()) {
    if (s.n < MIN_ATTEMPTS) {
      skipped += 1;
      continue;
    }
    // Laplace-smoothed correct rate, then logit difficulty.
    const p = (s.correct + 1) / (s.n + 2);
    const b = Math.max(-3, Math.min(3, Math.log((1 - p) / p)));
    const file = join(questionsDir, `${questionId}.json`);
    let optionCount = 4;
    let fileData: Record<string, unknown> | null = null;
    if (existsSync(file)) {
      try {
        fileData = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        if (Array.isArray(fileData.options)) optionCount = fileData.options.length;
        else if (fileData.type === 'truefalse') optionCount = 2;
      } catch {
        fileData = null;
      }
    }
    const a = 1.0;
    const c = optionCount >= 3 ? 0.25 : 0.5;
    // biome-ignore lint/suspicious/noConsoleLog: CLI script, console is the output
    console.log(
      `${questionId} | n=${s.n} | p=${p.toFixed(2)} | b=${b.toFixed(2)} | ${dryRun ? 'dry-run' : 'write'}`,
    );
    if (dryRun) continue;
    await db
      .update(schema.questions)
      .set({ irtA: a, irtB: b, irtC: c })
      .where(eq(schema.questions.id, questionId));
    if (fileData) {
      fileData.irtA = a;
      fileData.irtB = Math.round(b * 100) / 100;
      fileData.irtC = c;
      writeFileSync(file, `${JSON.stringify(fileData, null, 2)}\n`);
    }
    calibrated += 1;
  }
  // biome-ignore lint/suspicious/noConsoleLog: CLI script, console is the output
  console.log(
    `\nCalibrated: ${calibrated}, skipped (<${MIN_ATTEMPTS} attempts): ${skipped}${dryRun ? ' (dry run, nothing written)' : ''}`,
  );
}

await main();
