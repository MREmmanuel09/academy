/**
 * Sprint L2 → @academy/content episode importer.
 *
 * Reads the Sprint L2 v0.4 source tree (6 arcs × 5 episodes = 30
 * episodes) and produces:
 *
 *   packages/content/src/english/arcs/<arc-slug>/episodes/<episode-slug>.md
 *   packages/content/src/english/arcs/<arc-slug>/arc.json
 *
 * The episode body is the original markdown, with a YAML frontmatter
 * prepended (id, slug, arc, order, level, summary). The arc.json
 * file holds the arc-level metadata that the UI uses to render the
 * arc index.
 *
 * Idempotent: overwrites files in place. Running twice produces the
 * same output (modulo mtime).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface EpisodeMeta {
  id: string;
  slug: string;
  title: string;
  arc: string;
  order: number;
  level: string;
  estimatedMinutes: number;
  /** First non-empty paragraph, used as the episode summary. */
  summary: string;
}

export interface ArcMeta {
  slug: string;
  order: number;
  /** Spanish title (read from the source folder name). */
  title: string;
  /** Color (hex) for the UI; defaults to brand blue. */
  color: string;
}

export interface EpisodeImportReport {
  arcs: number;
  episodes: number;
  warnings: string[];
}

export interface EpisodeImportOptions {
  source: string;
  target: string;
}

const ARC_COLORS = [
  '#1e40af',
  '#047857',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0f766e',
] as const;

const ARC_LABELS_ES: Record<string, string> = {
  aterrizaje: 'Aterrizaje',
  sobrevivir: 'Sobrevivir',
  trabajo: 'Trabajo',
  'vida-cotidiana': 'Vida cotidiana',
  viajes: 'Viajes',
  'retos-laborales': 'Retos laborales',
};

export function importEpisodes(opts: EpisodeImportOptions): EpisodeImportReport {
  const sourceRoot = resolve(opts.source, 'content', 'arcs');
  const targetRoot = resolve(opts.target, 'english', 'arcs');
  const report: EpisodeImportReport = { arcs: 0, episodes: 0, warnings: [] };

  if (!existsSync(sourceRoot)) {
    throw new Error(`Sprint L2 source not found at ${sourceRoot}`);
  }

  const arcDirs = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  arcDirs.forEach((arcSlug, arcOrder) => {
    const arcDir = join(sourceRoot, arcSlug);
    const files = readdirSync(arcDir)
      .filter((f) => f.startsWith('episode-') && f.endsWith('.md'))
      .sort();

    if (files.length === 0) {
      report.warnings.push(`arc ${arcSlug}: no episodes found`);
      return;
    }

    const arcJsonDir = join(targetRoot, arcSlug);
    mkdirSync(arcJsonDir, { recursive: true });

    const arcMeta: ArcMeta = {
      slug: arcSlug,
      order: arcOrder,
      title: ARC_LABELS_ES[arcSlug] ?? arcSlug,
      color: ARC_COLORS[arcOrder % ARC_COLORS.length] as string,
    };
    writeFileSync(join(arcJsonDir, 'arc.json'), JSON.stringify(arcMeta, null, 2));
    report.arcs += 1;

    files.forEach((file, idx) => {
      const body = readFileSync(join(arcDir, file), 'utf8');
      const meta = parseEpisodeMeta(arcSlug, idx, file, body);
      const outPath = join(arcJsonDir, `${meta.slug}.md`);
      writeFileSync(outPath, renderEpisodeMarkdown(meta, body));
      report.episodes += 1;
    });
  });

  return report;
}

function parseEpisodeMeta(
  arcSlug: string,
  order: number,
  filename: string,
  body: string,
): EpisodeMeta {
  // The filename pattern is `episode-NN-slug.md`. The slug part may
  // include the numeric prefix (e.g. "01-welcome") — we strip that.
  const stem = filename.replace(/\.md$/, '');
  const slug = stem.replace(/^episode-\d+-/, '');

  // Try to extract title from the first H1.
  const titleMatch = /^#\s+(.+)$/m.exec(body);
  const title = titleMatch?.[1]?.trim() ?? stem;

  // Try to extract level from a "Target level: ..." line.
  const levelMatch = /\*\*Target level:\*\*\s*([A-C]\d(?:[A-C]\d)?)/.exec(body);
  const level = levelMatch?.[1] ?? 'A1';

  // Try to extract duration from a "Duration: ~N minutes" line.
  const durationMatch = /\*\*Duration:\*\*\s*~?(\d+)\s*min/i.exec(body);
  const estimatedMinutes = durationMatch?.[1] ? Number(durationMatch[1]) : 12;

  // Use the second non-empty paragraph as the summary.
  const summary = extractSummary(body);

  const id = `ep-${arcSlug.replace(/^\d+-/, '')}-${String(order + 1).padStart(2, '0')}`;

  return {
    id,
    slug,
    title,
    arc: arcSlug,
    order,
    level,
    estimatedMinutes,
    summary,
  };
}

function extractSummary(body: string): string {
  // Find the first paragraph after the frontmatter-style header lines
  // and before the first H2. Strip markdown emphasis and limit length.
  const lines = body.split('\n');
  const paragraphLines: string[] = [];
  let inHeader = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inHeader) {
      if (trimmed.startsWith('# ') || trimmed.startsWith('**') || trimmed === '' || trimmed.startsWith('---')) {
        continue;
      }
      inHeader = false;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) break;
    if (trimmed.startsWith('> ')) continue;
    if (trimmed === '') {
      if (paragraphLines.length > 0) break;
      continue;
    }
    paragraphLines.push(trimmed);
  }
  const summary = paragraphLines.join(' ').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  return summary.length > 200 ? `${summary.slice(0, 197)}...` : summary;
}

function renderEpisodeMarkdown(meta: EpisodeMeta, body: string): string {
  // Strip any leading H1 — we re-emit it after the frontmatter so the
  // title doesn't appear twice.
  const lines = body.split('\n');
  while (lines.length > 0 && lines[0]?.startsWith('# ')) {
    lines.shift();
  }
  while (lines.length > 0 && lines[0]?.trim() === '') {
    lines.shift();
  }
  const cleaned = lines.join('\n').trimStart();
  return [
    '---',
    `id: ${meta.id}`,
    `slug: ${meta.slug}`,
    `title: ${meta.title}`,
    `arc: ${meta.arc}`,
    `order: ${meta.order}`,
    `level: ${meta.level}`,
    `estimatedMinutes: ${meta.estimatedMinutes}`,
    `summary: ${escapeYaml(meta.summary)}`,
    '---',
    '',
    `# ${meta.title}`,
    '',
    cleaned,
  ].join('\n');
}

function escapeYaml(s: string): string {
  // Wrap in double quotes and escape backslashes/quotes.
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// CLI entry point.
function parseArgs(argv: readonly string[]): EpisodeImportOptions {
  let source = '';
  let target = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') {
      source = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--target') {
      target = argv[i + 1] ?? '';
      i += 1;
    }
  }
  if (!source || !target) {
    throw new Error(
      'Usage: episodes.ts --source <sprint-l2-src> --target <out-dir>',
    );
  }
  return { source, target };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  const report = importEpisodes(opts);
  console.log(`Imported ${report.episodes} episodes across ${report.arcs} arcs.`);
  if (report.warnings.length > 0) {
    console.log(`Warnings:`);
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  }
}
