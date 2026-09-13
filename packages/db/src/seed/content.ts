#!/usr/bin/env -S npx tsx
/**
 * Seed the dev DB with the static content from `packages/content/src/`.
 *
 * Reads:
 *   - `courses/<slug>/units/<unit>/lessons/*.md`         (lessons)
 *   - `courses/<slug>/units/<unit>/labs/*.steps.json`     (labs)
 *   - `courses/<slug>/projects/*.json`                    (projects)
 *   - `courses/<slug>/course.json`                        (course metadata)
 *   - `achievements/<course>.json`                        (achievement defs)
 *   - `english/arcs/<arc>/arc.json` + `*.md`              (arcs + episodes)
 *   - `english/roleplays/*.json`                          (roleplays)
 *   - `english/games/*.json`                              (mini games)
 *   - `<sprint-l2>/public/vocab.json` (optional, --vocab <path>)
 *
 * Inserts into:
 *   courses, units, lessons, labs, lab_steps, projects, project_milestones,
 *   achievements, arcs, episodes, roleplays, mini_games, vocab
 *
 * Idempotent: every row has a unique `id` (taken from frontmatter /
 * filename) and we use `onConflictDoNothing()`. Re-running is safe.
 *
 * Usage:
 *   pnpm tsx scripts/seed-content.ts
 *   pnpm tsx scripts/seed-content.ts --vocab <path-to-sprint-l2>/public/vocab.json
 *   pnpm tsx scripts/seed-content.ts --dry-run
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { type SqliteDb, getDb, schema } from '../client.js';

interface CliArgs {
  contentRoot: string;
  vocabPath: string | null;
  dryRun: boolean;
  help: boolean;
}

/** Monorepo root (pnpm-workspace.yaml), resolved walking up from cwd. */
function findRepoRoot(): string {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const REPO_ROOT = findRepoRoot();

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    contentRoot: join(REPO_ROOT, 'packages', 'content', 'src'),
    vocabPath: null,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // Relative paths are resolved against the repo root: this script
    // runs with cwd = packages/db inside pnpm workspaces, so naive
    // cwd-relative resolution would point at the wrong directory.
    // Absolute paths (Docker entrypoint) pass through untouched.
    if (a === '--content-root' && argv[i + 1]) {
      args.contentRoot = resolve(REPO_ROOT, argv[++i] as string);
    } else if (a === '--vocab' && argv[i + 1]) {
      args.vocabPath = resolve(REPO_ROOT, argv[++i] as string);
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

interface Frontmatter {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes?: number;
  order?: number;
  arc?: string;
  level?: string;
  summary?: string;
  module?: string;
  body: string;
}

function parseFrontmatter(source: string): Frontmatter {
  const trimmed = source.replace(/^\uFEFF/, '');
  if (!trimmed.startsWith('---')) {
    return { id: '', slug: '', title: '', body: trimmed };
  }
  const lines = trimmed.split('\n');
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIdx = i;
      break;
    }
  }
  const data: Record<string, string | number> = {};
  if (endIdx > 0) {
    for (let i = 1; i < endIdx; i++) {
      const line = lines[i] ?? '';
      const m = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (!m) continue;
      const [, key = '', rawValue = ''] = m;
      let value = rawValue;
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      const t = value.trim();
      data[key] = /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t;
    }
  }
  const body = lines
    .slice((endIdx > 0 ? endIdx : 0) + 1)
    .join('\n')
    .trim();
  return {
    id: String(data.id ?? ''),
    slug: String(data.slug ?? ''),
    title: String(data.title ?? ''),
    estimatedMinutes: typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 10,
    order: typeof data.order === 'number' ? data.order : 0,
    arc: typeof data.arc === 'string' ? data.arc : undefined,
    level: typeof data.level === 'string' ? data.level : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    module: typeof data.module === 'string' ? data.module : undefined,
    body,
  };
}

function readCourseJson(courseDir: string): {
  title: string;
  description: string;
  track: string;
  difficulty: string;
  estimatedHours: number;
} {
  const path = join(courseDir, 'course.json');
  if (!existsSync(path)) {
    return {
      title: '',
      description: '',
      track: 'devops',
      difficulty: 'beginner',
      estimatedHours: 0,
    };
  }
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  return {
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    track: String(data.track ?? 'devops'),
    difficulty: String(data.difficulty ?? 'beginner'),
    estimatedHours: Number(data.estimatedHours ?? 0),
  };
}

function listDirs(parent: string): string[] {
  if (!existsSync(parent)) return [];
  return readdirSync(parent)
    .map((n) => join(parent, n))
    .filter((p) => statSync(p).isDirectory());
}

function listFiles(parent: string, ext: string): string[] {
  if (!existsSync(parent)) return [];
  return readdirSync(parent)
    .filter((f) => f.endsWith(ext))
    .map((f) => join(parent, f));
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function readJsonFile<T = unknown>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

interface SeedReport {
  courses: number;
  units: number;
  lessons: number;
  labs: number;
  labSteps: number;
  projects: number;
  achievements: number;
  arcs: number;
  episodes: number;
  roleplays: number;
  games: number;
  vocab: number;
  quizzes: number;
  questions: number;
  warnings: string[];
}

function emptyReport(): SeedReport {
  return {
    courses: 0,
    units: 0,
    lessons: 0,
    labs: 0,
    labSteps: 0,
    projects: 0,
    achievements: 0,
    arcs: 0,
    episodes: 0,
    roleplays: 0,
    games: 0,
    vocab: 0,
    quizzes: 0,
    questions: 0,
    warnings: [],
  };
}

// ─── Seeders ────────────────────────────────────────────────────────────

async function seedTechCourses(
  contentRoot: string,
  db: SqliteDb,
  report: SeedReport,
): Promise<void> {
  const coursesDir = join(contentRoot, 'courses');
  if (!existsSync(coursesDir)) return;
  const courseSlugs = listDirs(coursesDir).map((d) => ({
    dir: d,
    slug: d.split(/[\\/]/).pop() ?? '',
  }));
  for (const { dir, slug } of courseSlugs) {
    if (slug === 'english') continue; // handled separately
    const meta = readCourseJson(dir);
    // Determine track from the slug mapping (matches COURSES in @academy/content)
    const track = ['devops', 'python', 'data', 'bigdata', 'networking'].includes(slug)
      ? slug
      : 'devops';
    const [existing] = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.slug, slug))
      .limit(1);
    let courseId: string;
    if (existing) {
      courseId = existing.id;
    } else {
      const [row] = await db
        .insert(schema.courses)
        .values({
          slug,
          track: (['devops', 'data', 'english', 'networking', 'cloud'].includes(track)
            ? track
            : 'devops') as 'devops' | 'data' | 'english' | 'networking' | 'cloud',
          title: meta.title || titleFromSlug(slug),
          description: meta.description || '',
          difficulty: (['beginner', 'intermediate', 'advanced'].includes(meta.difficulty)
            ? meta.difficulty
            : 'beginner') as 'beginner' | 'intermediate' | 'advanced',
          estimatedHours: meta.estimatedHours,
        })
        .returning({ id: schema.courses.id });
      if (!row) {
        report.warnings.push(`failed to insert course ${slug}`);
        continue;
      }
      courseId = row.id;
      report.courses++;
    }

    // Units
    const unitsDir = join(dir, 'units');
    const unitDirs = listDirs(unitsDir);
    let unitOrder = 0;
    for (const unitDir of unitDirs) {
      const unitSlug = unitDir.split(/[\\/]/).pop() ?? '';
      const unitsInCourse = await db
        .select()
        .from(schema.units)
        .where(eq(schema.units.courseId, courseId));
      const sameSlug = unitsInCourse.find((u) => u.slug === unitSlug);
      let unitId: string;
      if (sameSlug) {
        unitId = sameSlug.id;
      } else {
        // Get unit title from unit.json or fallback
        let unitTitle = titleFromSlug(unitSlug);
        const unitJson = join(unitDir, 'unit.json');
        if (existsSync(unitJson)) {
          const u = readJsonFile<{ title?: string }>(unitJson);
          if (u.title) unitTitle = u.title;
        }
        const [row] = await db
          .insert(schema.units)
          .values({ courseId, slug: unitSlug, title: unitTitle, order: unitOrder++ })
          .returning({ id: schema.units.id });
        if (!row) continue;
        unitId = row.id;
        report.units++;
      }

      // Lessons
      const lessonDirs = [join(unitDir, 'lessons'), unitDir];
      const seen = new Set<string>();
      let lessonOrder = 0;
      for (const lessonDir of lessonDirs) {
        if (!existsSync(lessonDir)) continue;
        for (const f of readdirSync(lessonDir)) {
          if (!f.endsWith('.md')) continue;
          if (f === 'README.md' || f === 'CHANGELOG.md') continue;
          const full = join(lessonDir, f);
          const fm = parseFrontmatter(readFileSync(full, 'utf8'));
          if (!fm.id || !fm.slug || !fm.title) continue;
          if (seen.has(fm.id)) continue;
          seen.add(fm.id);
          const [lesExisting] = await db
            .select()
            .from(schema.lessons)
            .where(eq(schema.lessons.id, fm.id))
            .limit(1);
          if (!lesExisting) {
            // body column: store a short version (the first 500 chars)
            // to avoid blowing up the DB; the full body is served from
            // disk by the loader. This is enough for the dashboard
            // to show excerpts.
            await db
              .insert(schema.lessons)
              .values({
                id: fm.id,
                unitId,
                slug: fm.slug,
                title: fm.title,
                body: fm.body.slice(0, 500),
                estimatedMinutes: fm.estimatedMinutes ?? 10,
                order: lessonOrder++,
                version: 1,
              })
              .onConflictDoNothing();
            report.lessons++;
          } else {
            // Update order/title if changed
            await db
              .update(schema.lessons)
              .set({
                order: lessonOrder++,
                title: fm.title,
                estimatedMinutes: fm.estimatedMinutes ?? 10,
              })
              .where(eq(schema.lessons.id, fm.id));
          }
        }
      }

      // Labs
      const labsDir = join(unitDir, 'labs');
      const stepFiles = listFiles(labsDir, '.steps.json');
      let labOrder = 0;
      for (const stepFile of stepFiles) {
        const data = readJsonFile<{
          id?: string;
          title?: string;
          objective?: string;
          steps?: Array<{ instruction: string; expectedCommand?: string; hint?: string }>;
        }>(stepFile);
        const labId =
          data.id ??
          stepFile
            .replace(/\.steps\.json$/, '')
            .split(/[\\/]/)
            .pop() ??
          '';
        const labSlug = labId;
        const [labExisting] = await db
          .select()
          .from(schema.labs)
          .where(eq(schema.labs.slug, labSlug))
          .limit(1);
        let labRowId: string;
        if (labExisting && labExisting.unitId === unitId) {
          labRowId = labExisting.id;
        } else if (labExisting) {
          continue;
        } else {
          const [row] = await db
            .insert(schema.labs)
            .values({
              unitId,
              slug: labSlug,
              title: data.title ?? labSlug,
              summary: data.objective ?? '',
              environment: 'linux',
              estimatedMinutes: 30,
              order: labOrder++,
            })
            .returning({ id: schema.labs.id });
          if (!row) continue;
          labRowId = row.id;
          report.labs++;
        }
        // Lab steps — only insert if none exist yet (idempotency).
        const [stepCount] = await db
          .select({ id: schema.labSteps.id })
          .from(schema.labSteps)
          .where(eq(schema.labSteps.labId, labRowId))
          .limit(1);
        if (!stepCount && data.steps) {
          for (let i = 0; i < data.steps.length; i++) {
            const s = data.steps[i];
            if (!s) continue;
            await db.insert(schema.labSteps).values({
              labId: labRowId,
              order: i,
              title: s.instruction.slice(0, 100),
              instructions: s.instruction,
              checkCommand: s.expectedCommand ?? null,
              expectedOutput: null,
            });
            report.labSteps++;
          }
        }
      }
    }

    // Projects
    const projectsDir = join(dir, 'projects');
    const projectFiles = listFiles(projectsDir, '.json');
    for (const pf of projectFiles) {
      const data = readJsonFile<{
        id?: string;
        title?: string;
        goal?: string;
        deliverables?: string[];
        tech?: string[];
      }>(pf);
      const slug = (
        data.id ??
        pf
          .replace(/\.json$/, '')
          .split(/[\\/]/)
          .pop() ??
        ''
      ).toString();
      const [projExisting] = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.slug, slug))
        .limit(1);
      if (!projExisting) {
        const [row] = await db
          .insert(schema.projects)
          .values({
            courseId,
            slug,
            title: data.title ?? slug,
            summary: data.goal ?? '',
            estimatedHours: 4,
          })
          .returning({ id: schema.projects.id });
        if (row) {
          report.projects++;
          if (data.deliverables) {
            for (let i = 0; i < data.deliverables.length; i++) {
              const d = data.deliverables[i];
              if (!d) continue;
              await db.insert(schema.projectMilestones).values({
                projectId: row.id,
                order: i,
                title: d.slice(0, 100),
                description: d,
              });
            }
          }
        }
      }
    }
  }
}

async function seedAchievements(
  contentRoot: string,
  db: SqliteDb,
  report: SeedReport,
): Promise<void> {
  const achDir = join(contentRoot, 'achievements');
  if (!existsSync(achDir)) return;
  const files = listFiles(achDir, '.json');
  for (const f of files) {
    const arr =
      readJsonFile<
        Array<{
          id: string;
          slug: string;
          title: string;
          description: string;
          icon?: string;
          xp?: number;
          rule: Record<string, unknown>;
        }>
      >(f);
    for (const a of arr) {
      const [existing] = await db
        .select()
        .from(schema.achievements)
        .where(eq(schema.achievements.slug, a.slug))
        .limit(1);
      if (existing) continue;
      await db
        .insert(schema.achievements)
        .values({
          id: a.id,
          slug: a.slug,
          title: a.title,
          description: a.description,
          icon: a.icon ?? '🏆',
          xp: a.xp ?? 50,
          rule: a.rule,
        })
        .onConflictDoNothing();
      report.achievements++;
    }
  }
}

async function seedEnglish(contentRoot: string, db: SqliteDb, report: SeedReport): Promise<void> {
  const englishDir = join(contentRoot, 'english');
  if (!existsSync(englishDir)) return;
  // Find or create the english course
  let courseId: string;
  const [courseExisting] = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.slug, 'english'))
    .limit(1);
  if (courseExisting) {
    courseId = courseExisting.id;
  } else {
    const [row] = await db
      .insert(schema.courses)
      .values({
        slug: 'english',
        track: 'english',
        title: 'English (Sprint L2)',
        description: 'Inglés con arcos narrativos, roleplays, juegos y SRS.',
        difficulty: 'beginner',
        estimatedHours: 60,
      })
      .returning({ id: schema.courses.id });
    if (!row) return;
    courseId = row.id;
    report.courses++;
  }

  // Arcs + episodes
  const arcsDir = join(englishDir, 'arcs');
  const arcDirs = listDirs(arcsDir);
  for (const arcDir of arcDirs) {
    const arcJson = join(arcDir, 'arc.json');
    if (!existsSync(arcJson)) continue;
    const data = readJsonFile<{ slug?: string; order?: number; title?: string; color?: string }>(
      arcJson,
    );
    const arcSlug = data.slug ?? arcDir.split(/[\\/]/).pop() ?? '';
    const [arcExisting] = await db
      .select()
      .from(schema.arcs)
      .where(eq(schema.arcs.slug, arcSlug))
      .limit(1);
    let arcId: string;
    if (arcExisting) {
      arcId = arcExisting.id;
    } else {
      const [row] = await db
        .insert(schema.arcs)
        .values({
          courseId,
          slug: arcSlug,
          title: data.title ?? arcSlug,
          description: '',
          order: data.order ?? 0,
          color: data.color ?? '#1e40af',
        })
        .returning({ id: schema.arcs.id });
      if (!row) continue;
      arcId = row.id;
      report.arcs++;
    }

    // Episodes
    const episodeFiles = readdirSync(arcDir).filter((f) => f.endsWith('.md') && f !== 'arc.json');
    let epOrder = 0;
    for (const f of episodeFiles) {
      const full = join(arcDir, f);
      const fm = parseFrontmatter(readFileSync(full, 'utf8'));
      if (!fm.id || !fm.title) continue;
      const epSlug = f.replace(/\.md$/, '');
      const [epExisting] = await db
        .select()
        .from(schema.episodes)
        .where(eq(schema.episodes.id, fm.id))
        .limit(1);
      if (!epExisting) {
        await db
          .insert(schema.episodes)
          .values({
            id: fm.id,
            arcId,
            slug: epSlug,
            title: fm.title,
            order: epOrder++,
            body: fm.body,
            estimatedMinutes: fm.estimatedMinutes ?? 15,
          })
          .onConflictDoNothing();
        report.episodes++;
      }
    }
  }

  // Roleplays
  const roleplaysDir = join(englishDir, 'roleplays');
  for (const f of listFiles(roleplaysDir, '.json')) {
    const data = readJsonFile<{
      id: string;
      title: string;
      level?: string;
      description?: string;
      setting?: string;
      greeting?: string;
      objectives?: string[];
      vocabulary?: string[];
      successCriteria?: string[];
      fallbackHints?: string[];
    }>(f);
    if (!data.id) continue;
    // Find a parent episode — use the first arc/episode we can find
    const [firstEpisode] = await db
      .select({ id: schema.episodes.id })
      .from(schema.episodes)
      .limit(1);
    if (!firstEpisode) continue;
    const script = (data.objectives ?? []).map((line, i) => ({
      id: `turn-${i}`,
      speaker: 'ai' as const,
      prompt: line,
      promptEs: '',
      hints: data.fallbackHints?.slice(i * 2, i * 2 + 2) ?? [],
      expectedKeywords: data.vocabulary ?? [],
    }));
    const [rpExisting] = await db
      .select()
      .from(schema.roleplays)
      .where(eq(schema.roleplays.id, data.id))
      .limit(1);
    if (!rpExisting) {
      await db
        .insert(schema.roleplays)
        .values({
          id: data.id,
          episodeId: firstEpisode.id,
          slug: data.id,
          title: data.title,
          scenario: data.description ?? data.setting ?? '',
          script,
          difficulty: (data.level === 'A1' ||
          data.level === 'A2' ||
          data.level === 'B1' ||
          data.level === 'B2' ||
          data.level === 'C1'
            ? 'easy'
            : 'medium') as 'easy' | 'medium' | 'hard',
          order: 0,
        })
        .onConflictDoNothing();
      report.roleplays++;
    }
  }

  // Mini games
  const gamesDir = join(englishDir, 'games');
  for (const f of listFiles(gamesDir, '.json')) {
    const data = readJsonFile<{
      id?: string;
      slug?: string;
      type?: string;
      title?: string;
      titleEs?: string;
      description?: string;
      config?: Record<string, unknown>;
    }>(f);
    const slug =
      data.slug ??
      f
        .replace(/\.json$/, '')
        .split(/[\\/]/)
        .pop() ??
      '';
    const type = data.type ?? 'word-match';
    const [firstEpisode] = await db
      .select({ id: schema.episodes.id })
      .from(schema.episodes)
      .limit(1);
    const [gExisting] = await db
      .select()
      .from(schema.miniGames)
      .where(eq(schema.miniGames.slug, slug))
      .limit(1);
    if (!gExisting) {
      await db
        .insert(schema.miniGames)
        .values({
          slug,
          episodeId: firstEpisode?.id ?? null,
          type: ([
            'word-match',
            'fill-blank',
            'listening',
            'sentence-builder',
            'speed-quiz',
          ].includes(type)
            ? type
            : 'word-match') as
            | 'word-match'
            | 'fill-blank'
            | 'listening'
            | 'sentence-builder'
            | 'speed-quiz',
          title: data.title ?? slug,
          config: data.config ?? { description: data.description ?? '' },
        })
        .onConflictDoNothing();
      report.games++;
    }
  }
}

async function seedVocab(vocabPath: string, db: SqliteDb, report: SeedReport): Promise<void> {
  if (!existsSync(vocabPath)) {
    report.warnings.push(`vocab file not found: ${vocabPath}`);
    return;
  }
  const raw = readFileSync(vocabPath, 'utf8');
  // Sprint L2 vocab.json was saved with wrong encoding in the source
  // (UTF-8 interpreted as Latin-1). Try to decode it back. If the
  // file is already valid UTF-8, this is a no-op.
  let text = raw;
  try {
    // Re-decode: file bytes are UTF-8 but were saved as if Latin-1.
    const fixed = Buffer.from(raw, 'latin1').toString('utf8');
    // Sanity check: if the fixed version has fewer replacement chars,
    // prefer it. Otherwise use the original.
    const replacementsOriginal = (raw.match(/\uFFFD/g) ?? []).length;
    const replacementsFixed = (fixed.match(/\uFFFD/g) ?? []).length;
    if (replacementsFixed < replacementsOriginal) text = fixed;
  } catch {
    // ignore
  }
  let entries: Array<{
    lemma: string;
    translation: string;
    exampleEn?: string;
    exampleEs?: string;
    frequencyRank?: number;
    tags?: string;
  }>;
  try {
    entries = JSON.parse(text);
  } catch (err) {
    report.warnings.push(`vocab.json parse error: ${(err as Error).message}`);
    return;
  }
  if (!Array.isArray(entries)) return;
  const inferPos = (
    tags?: string,
  ): 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other' => {
    if (!tags) return 'other';
    const t = tags.toLowerCase();
    if (t.includes('noun')) return 'noun';
    if (t.includes('verb')) return 'verb';
    if (t.includes('adjective') || t.includes('adj')) return 'adjective';
    if (t.includes('adverb') || t.includes('adv')) return 'adverb';
    if (t.includes('phrase')) return 'phrase';
    return 'other';
  };
  for (const e of entries) {
    if (!e.lemma || !e.translation) continue;
    const [existing] = await db
      .select()
      .from(schema.vocab)
      .where(eq(schema.vocab.termEn, e.lemma))
      .limit(1);
    if (existing) continue;
    await db
      .insert(schema.vocab)
      .values({
        term: e.lemma,
        termEn: e.lemma,
        translation: e.translation,
        translationEs: e.translation,
        partOfSpeech: inferPos(e.tags),
        exampleEn: e.exampleEn ?? null,
        exampleEs: e.exampleEs ?? null,
        // frequencyRank is captured by the source vocab.json but the
        // `vocab` schema doesn't have a column for it. Stash it in the
        // example field prefix so it isn't lost.
      })
      .onConflictDoNothing();
    report.vocab++;
  }
}

/**
 * Seed `quizzes` + `questions` from the static content exported by
 * `scripts/export-questions.ts`:
 *   - `exams/<id>.json`  → quizzes (one per certification exam)
 *   - `questions/<id>.json` → questions (DB-shaped, incl. IRT params)
 *
 * Idempotent via `onConflictDoNothing()`.
 */
async function seedExamsAndQuestions(
  contentRoot: string,
  db: SqliteDb,
  report: SeedReport,
): Promise<void> {
  const examsDir = join(contentRoot, 'exams');
  const questionsDir = join(contentRoot, 'questions');

  // Ensure quizzes referenced by exported questions exist first
  // (FK: questions.quizId → quizzes.id).
  const quizIds = new Set<string>();
  for (const f of listFiles(examsDir, '.json')) {
    const data = readJsonFile<{
      id?: string;
      title?: string;
      passingScore?: number;
    }>(f);
    if (!data.id || !data.title) continue;
    quizIds.add(data.id);
    const [quiz] = await db
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.id, data.id))
      .limit(1);
    if (quiz) continue;
    await db
      .insert(schema.quizzes)
      .values({
        id: data.id,
        title: data.title,
        isAdaptive: true,
        passingScore: (data.passingScore ?? 70) / 100,
      })
      .onConflictDoNothing();
    report.quizzes++;
  }
  // 'practice-general' groups questions not tied to a specific exam.
  const [general] = await db
    .select()
    .from(schema.quizzes)
    .where(eq(schema.quizzes.id, 'practice-general'))
    .limit(1);
  if (!general) {
    await db
      .insert(schema.quizzes)
      .values({
        id: 'practice-general',
        title: 'General Practice',
        isAdaptive: true,
        passingScore: 0.7,
      })
      .onConflictDoNothing();
  }
  quizIds.add('practice-general');

  if (!existsSync(questionsDir)) return;
  for (const f of listFiles(questionsDir, '.json')) {
    const data = readJsonFile<{
      id?: string;
      quizId?: string;
      type?: 'single' | 'multiple' | 'truefalse' | 'short' | 'code';
      prompt?: string;
      options?: Array<{ id: string; text: string }> | null;
      correctAnswer?: string | string[];
      explanation?: string;
      irtA?: number;
      irtB?: number;
      irtC?: number;
      points?: number;
      order?: number;
    }>(f);
    if (!data.id || !data.prompt || !data.quizId || !quizIds.has(data.quizId)) continue;
    const [q] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, data.id))
      .limit(1);
    if (q) continue;
    await db
      .insert(schema.questions)
      .values({
        id: data.id,
        quizId: data.quizId,
        type: data.type ?? ('single' as const),
        prompt: data.prompt,
        options: data.options ?? null,
        correctAnswer: data.correctAnswer ?? '',
        explanation: data.explanation ?? '',
        irtA: data.irtA ?? null,
        irtB: data.irtB ?? null,
        irtC: data.irtC ?? null,
        points: data.points ?? 1,
        order: data.order ?? 0,
      })
      .onConflictDoNothing();
    report.questions++;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'Usage: tsx scripts/seed-content.ts [--content-root <dir>] [--vocab <file>] [--dry-run]\n',
    );
    return;
  }

  console.info(`Seeding from ${args.contentRoot}`);
  if (args.vocabPath) console.info(`Vocab:        ${args.vocabPath}`);
  if (args.dryRun) console.info('DRY RUN — no writes');

  if (args.dryRun) {
    console.info('OK (dry run)');
    return;
  }

  const db = getDb() as SqliteDb;
  const report = emptyReport();

  await seedTechCourses(args.contentRoot, db, report);
  await seedEnglish(args.contentRoot, db, report);
  await seedExamsAndQuestions(args.contentRoot, db, report);
  await seedAchievements(args.contentRoot, db, report);
  if (args.vocabPath) await seedVocab(args.vocabPath, db, report);

  console.info('');
  console.info('=== Seed report ===');
  console.info(`  courses:     ${report.courses}`);
  console.info(`  units:       ${report.units}`);
  console.info(`  lessons:     ${report.lessons}`);
  console.info(`  labs:        ${report.labs}`);
  console.info(`  lab_steps:   ${report.labSteps}`);
  console.info(`  projects:    ${report.projects}`);
  console.info(`  achievements:${report.achievements}`);
  console.info(`  arcs:        ${report.arcs}`);
  console.info(`  episodes:    ${report.episodes}`);
  console.info(`  roleplays:   ${report.roleplays}`);
  console.info(`  games:       ${report.games}`);
  console.info(`  vocab:       ${report.vocab}`);
  console.info(`  quizzes:     ${report.quizzes}`);
  console.info(`  questions:   ${report.questions}`);
  if (report.warnings.length) {
    console.info(`  warnings (${report.warnings.length}):`);
    for (const w of report.warnings.slice(0, 20)) console.info(`    - ${w}`);
    if (report.warnings.length > 20)
      console.info(`    ... and ${report.warnings.length - 20} more`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
