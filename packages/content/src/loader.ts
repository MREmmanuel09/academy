/**
 * @academy/content loader.
 *
 * Reads the content files produced by the RedLab and Sprint L2
 * importers (Fases 3 y 4) and exposes them as typed structures
 * consumable by the web UI.
 *
 * ## Why a loader instead of DB
 *
 * Lessons and roleplays are static (they don't change at runtime).
 * Reading them from the filesystem at request time is fast enough
 * (the dev server caches the result, and prod build pre-renders) and
 * avoids the 200+ row join we'd otherwise need.
 *
 * Vocab, user progress, achievements, etc. DO live in the DB and
 * are accessed through `@academy/db`. The split is intentional:
 *   - Static content: filesystem (this module)
 *   - User state: DB (@academy/db)
 *
 * ## Module resolution
 *
 * The package ships its `src/` files as the runtime entry (we use
 * `transpilePackages: ['@academy/content']` in next.config.ts). The
 * loader finds the content directory by walking up from this file
 * to the monorepo root, then into `apps/web/data/...` — but we
 * actually expose the path as a parameter so the web layer can
 * configure it for tests.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { COURSES } from './courses.js';

export type CourseDefinition = {
  slug: string;
  track: 'devops' | 'data' | 'english' | 'networking' | 'cloud';
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
};

export interface LessonFrontmatter {
  id: string;
  slug: string;
  title: string;
  module?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes?: number;
  xp?: number;
  summary?: string;
  level?: string;
  arc?: string;
  order?: number;
}

export interface Lesson extends LessonFrontmatter {
  /** Markdown body (frontmatter stripped). */
  body: string;
  /** Source file path relative to the content root. */
  sourcePath: string;
}

export interface Unit {
  slug: string;
  title: string;
  order: number;
  lessons: Lesson[];
  labs: Lab[];
  /** Optional exam (one per unit in the Sprint L2 model). */
  exam?: Exam;
}

export interface TopologyDevice {
  type: 'router' | 'switch' | 'pc' | 'server' | 'firewall' | 'cloud';
  name: string;
  x: number;
  y: number;
}

export interface TopologyLink {
  from: string;
  to: string;
  label?: string;
}

export interface Topology {
  devices: TopologyDevice[];
  links: TopologyLink[];
}

export interface Lab {
  id: string;
  slug: string;
  title: string;
  objective: string;
  steps: { instruction: string; expectedCommand?: string; hint?: string }[];
  topology?: Topology;
  /** "Definition of done" shown when all steps complete (null = none). */
  validation?: string | null;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  scenario: string;
  goal: string;
  deliverables: string[];
  tech: string[];
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  xp: number;
  questionIds: string[];
}

export interface CourseContent {
  definition: CourseDefinition;
  units: Unit[];
  projects: Project[];
}

/** Default content root. Overridable via `setContentRoot()` for tests. */
let _contentRoot: string | null = null;

export function setContentRoot(root: string): void {
  _contentRoot = root;
}

export function getContentRoot(): string {
  if (_contentRoot) return _contentRoot;
  // Find the monorepo root by walking up from the current working
  // directory until we find a directory that contains
  // `packages/content/src`. This works whether the server is started
  // from the monorepo root or from `apps/web`.
  const fs = require('node:fs') as typeof import('node:fs');
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(dir, 'packages/content/src');
    if (fs.existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: cwd-relative path (matches the original behaviour).
  return resolve(process.cwd(), 'packages/content/src');
}

export function listCourses(): readonly CourseDefinition[] {
  return COURSES;
}

export function getCourse(slug: string): CourseDefinition | null {
  return COURSES.find((c) => c.slug === slug) ?? null;
}

/**
 * Load the full content tree for a course. Each file is read once
 * and cached for the lifetime of the process. For the dev server
 * with hot reload, this means file changes require a restart — but
 * that's fine because content only changes via the import scripts,
 * not at runtime.
 */
const _cache = new Map<string, CourseContent>();

export function loadCourse(slug: string): CourseContent | null {
  const def = getCourse(slug);
  if (!def) return null;
  const cached = _cache.get(slug);
  if (cached) return cached;
  const content = readCourse(slug, def);
  if (content) _cache.set(slug, content);
  return content;
}

export function clearCache(): void {
  _cache.clear();
}

function readCourse(slug: string, def: CourseDefinition): CourseContent | null {
  const root = getContentRoot();

  // The English course lives outside `courses/` — its arcs live in
  // `english/arcs/<arc>/` (Sprint L2 layout). We read them as units
  // and the episode .md files as lessons.
  if (slug === 'english') {
    return readEnglishCourse(root, def);
  }

  const courseDir = join(root, 'courses', slug);
  if (!existsSync(courseDir)) return null;

  const unitsDir = join(courseDir, 'units');
  const units: Unit[] = [];
  if (existsSync(unitsDir)) {
    const unitDirs = readdirSync(unitsDir)
      .map((name) => ({ name, path: join(unitsDir, name) }))
      .filter((d) => statSync(d.path).isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const { name, path } of unitDirs) {
      const unit = readUnit(slug, name, path);
      if (unit) units.push(unit);
    }
  }

  // Global exam definitions (Fase 4+: `exams/<id>.json`). Each file
  // declares the course/unit it belongs to, used for the exam badge
  // on the unit page. Legacy per-unit `<unit>/exams/*.json` is also
  // still scanned in `readUnit`.
  const examsDir = join(root, 'exams');
  if (existsSync(examsDir)) {
    for (const f of readdirSync(examsDir)) {
      if (!f.endsWith('.json')) continue;
      const source = JSON.parse(readFileSync(join(examsDir, f), 'utf8')) as Record<string, unknown>;
      if (source.course !== slug) continue;
      const unit = units.find((u) => u.slug === source.unit);
      if (!unit) continue;
      const exam = examFromJson(source, f);
      if (exam && !unit.exam) unit.exam = exam;
    }
  }

  const projects: Project[] = [];

  // Units display in `unit.json` order; unordered units (order 0/missing)
  // keep alphabetical order after the ordered ones.
  const ORDER_LAST = Number.MAX_SAFE_INTEGER;
  units.sort(
    (a, b) => (a.order || ORDER_LAST) - (b.order || ORDER_LAST) || a.slug.localeCompare(b.slug),
  );

  // Units display in `unit.json` order; unordered units (order 0/missing)
  // keep alphabetical order after the ordered ones.
  const projectsDir = join(courseDir, 'projects');
  if (existsSync(projectsDir)) {
    for (const f of readdirSync(projectsDir)) {
      if (!f.endsWith('.json')) continue;
      const data = JSON.parse(readFileSync(join(projectsDir, f), 'utf8')) as Record<
        string,
        unknown
      >;
      // The rich copy (title/scenario/goal) lives in the sibling .md
      // file (<id>.md with ## Escenario / ## Meta sections); the JSON
      // only carries id/deliverables/tech. Merge both so project pages
      // don't render empty.
      const base = f.replace(/\.deliverables\.json$/, '').replace(/\.json$/, '');
      const mdFile = join(projectsDir, `${base}.md`);
      let title = '';
      let scenario = '';
      let goal = '';
      if (existsSync(mdFile)) {
        const { data: fm, content } = parseFrontmatter(readFileSync(mdFile, 'utf8'));
        const meta = fm as unknown as { title?: unknown };
        if (typeof meta.title === 'string') title = meta.title;
        scenario = extractSection(content, 'Escenario');
        goal = extractSection(content, 'Meta');
      }
      projects.push({
        id: String(data.id ?? f.replace(/\.json$/, '')),
        slug: String(data.id ?? f.replace(/\.json$/, '')),
        title,
        scenario,
        goal,
        deliverables: (data.deliverables as string[]) ?? [],
        tech: (data.tech as string[]) ?? [],
      });
    }
  }

  return { definition: def, units, projects };
}

/**
 * Read the Sprint L2 English course: one unit per arc, one lesson per
 * episode. Arc metadata (title/order) comes from `arc.json`.
 */
function readEnglishCourse(root: string, def: CourseDefinition): CourseContent | null {
  const arcsDir = join(root, 'english', 'arcs');
  if (!existsSync(arcsDir)) return null;

  const arcDirs = readdirSync(arcsDir)
    .map((name) => ({ name, path: join(arcsDir, name) }))
    .filter((d) => statSync(d.path).isDirectory());

  const units: Unit[] = arcDirs
    .map(({ name, path }) => readUnit('english', name, path))
    .filter((u): u is Unit => u !== null);

  return { definition: def, units, projects: [] };
}

/** Convert a parsed exam JSON (with `id`/`title`/...) into a typed Exam. */
function examFromJson(data: Record<string, unknown>, file: string): Exam | null {
  const title = String(data.title ?? '');
  if (!title) return null;
  return {
    id: String(data.id ?? file.replace(/\.json$/, '')),
    title,
    description: String(data.description ?? ''),
    totalQuestions: Number(data.totalQuestions ?? 0),
    passingScore: Number(data.passingScore ?? 0),
    xp: Number(data.xp ?? 0),
    questionIds: (data.questionIds as string[]) ?? [],
  };
}

function readUnit(_courseSlug: string, unitSlug: string, unitDir: string): Unit | null {
  const lessons: Lesson[] = [];

  // Lessons can live in either:
  //   <unitDir>/lessons/*.md   (clean layout from a future refactor)
  //   <unitDir>/*.md            (legacy: Fase 3 importer dumps flat)
  // We scan both, deduplicating by lesson id.
  const lessonDirs = [join(unitDir, 'lessons'), unitDir];
  for (const dir of lessonDirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      if (f === 'README.md' || f === 'CHANGELOG.md') continue;
      const lesson = readLesson(join(dir, f), unitDir);
      if (!lesson) continue;
      if (!lessons.some((l) => l.id === lesson.id)) {
        lessons.push(lesson);
      }
    }
  }
  // Sort by the frontmatter `order` when present (Sprint L2 episodes),
  // otherwise by natural filename order (`l-2` before `l-10`).
  lessons.sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.slug.localeCompare(b.slug, undefined, { numeric: true }),
  );

  const labs: Lab[] = [];
  const labsDir = join(unitDir, 'labs');
  if (existsSync(labsDir)) {
    for (const f of readdirSync(labsDir)) {
      if (!f.endsWith('.steps.json')) continue;
      const data = JSON.parse(readFileSync(join(labsDir, f), 'utf8')) as Record<string, unknown>;
      labs.push({
        id: String(data.id ?? f.replace(/\.steps\.json$/, '')),
        slug: String(data.id ?? f.replace(/\.steps\.json$/, '')),
        title: String(data.title ?? ''),
        objective: String(data.objective ?? ''),
        steps: (data.steps as Lab['steps']) ?? [],
        topology: data.topology as Topology | undefined,
        validation: typeof data.validation === 'string' ? data.validation : null,
      });
    }
  }

  const examsDir = join(unitDir, 'exams');
  let exam: Exam | undefined;
  if (existsSync(examsDir)) {
    const examFiles = readdirSync(examsDir).filter((f) => f.endsWith('.json'));
    // Take the first exam alphabetically — that's deterministic and
    // avoids a `!` non-null assertion under `noUncheckedIndexedAccess`.
    const firstExam = [...examFiles].sort()[0];
    if (firstExam !== undefined) {
      const data = JSON.parse(readFileSync(join(examsDir, firstExam), 'utf8')) as Record<
        string,
        unknown
      >;
      exam = examFromJson(data, firstExam) ?? undefined;
    }
  }

  return {
    slug: unitSlug,
    title: unitTitle(unitDir, unitSlug),
    order: unitOrder(unitDir),
    lessons,
    labs,
    exam,
  };
}

/** Unit display title: prefer `unit.json` (tech) / `arc.json`
 * (english arcs), falling back to a slug-derived title. */
function unitTitle(unitDir: string, unitSlug: string): string {
  const json = readUnitMeta(unitDir);
  const title = json?.title;
  if (typeof title === 'string' && title.length > 0) return title;
  return titleFromSlug(unitSlug);
}

function unitOrder(unitDir: string): number {
  const json = readUnitMeta(unitDir);
  return typeof json?.order === 'number' ? json.order : 0;
}

function readUnitMeta(unitDir: string): Record<string, unknown> | null {
  for (const meta of ['unit.json', 'arc.json']) {
    const p = join(unitDir, meta);
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Extract the body of a `## <heading>` markdown section (up to the next
 * `## ` heading or end of file). Used for project `## Escenario` /
 * `## Meta` sections.
 */
function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return '';
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

function readLesson(file: string, _unitDir: string): Lesson | null {
  const raw = readFileSync(file, 'utf8');
  const { data, content } = parseFrontmatter(raw);
  const fm = data as unknown as Partial<LessonFrontmatter>;
  if (!fm.id || !fm.slug || !fm.title) return null;
  return {
    id: fm.id,
    slug: fm.slug,
    title: fm.title,
    module: fm.module,
    difficulty: fm.difficulty,
    estimatedMinutes: fm.estimatedMinutes ?? 10,
    xp: fm.xp,
    summary: fm.summary,
    level: fm.level,
    arc: fm.arc,
    order: fm.order,
    body: content.trim(),
    sourcePath: file,
  };
}

/**
 * Minimal frontmatter parser for the `key: value` shape we use in
 * our content files. We deliberately avoid `gray-matter` (and its
 * `js-yaml@3` transitive dep) because pnpm's strict hoisting means
 * that sub-deps aren't always resolvable from the consumer app.
 *
 * Format:
 *   ---
 *   id: foo
 *   slug: bar
 *   title: Hello
 *   estimatedMinutes: 15
 *   ---
 *   # Body starts here
 *
 * We type-coerce numeric values so the consumer can read them as
 * numbers without re-parsing. This matches the YAML semantics that
 * `gray-matter` provided.
 *
 * Limitations:
 *   - Multi-line values (folded scalars, `>`, `|`, `>-`) are NOT
 *     supported. We use simple `key: value` only.
 *   - Arrays (`key: [a, b]`) and nested objects are NOT supported.
 *     Our frontmatter is flat and string-typed, so this is fine.
 */
function parseFrontmatter(source: string): {
  data: Record<string, string | number>;
  content: string;
} {
  const trimmed = source.replace(/^\uFEFF/, '');
  if (!trimmed.startsWith('---')) {
    return { data: {}, content: trimmed };
  }
  // Find the closing `---` on its own line.
  const lines = trimmed.split('\n');
  let endIdx = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx < 0) {
    return { data: {}, content: trimmed };
  }
  const data: Record<string, string | number> = {};
  for (let i = 1; i < endIdx; i += 1) {
    const line = lines[i] ?? '';
    // The regex has two capture groups, so `m[1]` and `m[2]` always
    // exist when the match is non-null. Destructure to satisfy TS
    // without a non-null assertion. The `??` fallbacks handle
    // `noUncheckedIndexedAccess` widening to `string | undefined`.
    const m = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key = '', rawValue = ''] = m;
    let value = rawValue;
    // Strip surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const trimmedValue = value.trim();
    // Type-coerce numbers.
    if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
      data[key] = Number(trimmedValue);
    } else {
      data[key] = trimmedValue;
    }
  }
  const content = lines
    .slice(endIdx + 1)
    .join('\n')
    .trim();
  return { data, content };
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Re-export for convenience.
export { COURSES } from './courses.js';
