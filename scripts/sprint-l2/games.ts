/**
 * Sprint L2 mini-games → @academy/content.
 *
 * ## Actual vs documented counts
 *
 * The Sprint L2 README claims 5 mini-games, but only 4 ship with
 * content data files: false-friends, grammar, idioms-uk, listening.
 * The remaining 2 (speed-recall, word-match) exist only as UI
 * placeholders with no source data.
 *
 * We migrate the 4 with data, and emit 1 placeholder for "word-match"
 * (the schema is stable enough that we can write an empty
 * implementation in a later phase). `idioms-uk` ships as a 4th game
 * with its own data; we keep it as a distinct game (not folded into
 * vocab) because it has a different interaction model.
 *
 * ## Output
 *
 *   packages/content/src/english/games/<slug>.json
 *
 * Each file is either a verbatim copy of the source JSON, or a
 * generated placeholder with an empty `rounds`/`questions` array.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface GameImportReport {
  copied: number;
  placeholders: number;
  warnings: string[];
}

export interface GameImportOptions {
  source: string;
  target: string;
}

const PLACEHOLDER_GAMES: Array<{ slug: string; title: string; titleEs: string; description: string; type: string }> = [
  {
    slug: 'word-match',
    title: 'Word match',
    titleEs: 'Emparejar palabras',
    description: 'Match English words to their Spanish translations as fast as you can.',
    type: 'word-match',
  },
];

export function importGames(opts: GameImportOptions): GameImportReport {
  const sourceDir = resolve(opts.source, 'content', 'games');
  const targetDir = resolve(opts.target, 'english', 'games');
  const report: GameImportReport = { copied: 0, placeholders: 0, warnings: [] };

  if (!existsSync(sourceDir)) {
    throw new Error(`Sprint L2 games dir not found at ${sourceDir}`);
  }

  mkdirSync(targetDir, { recursive: true });

  for (const file of readdirSync(sourceDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const src = join(sourceDir, file);
    const dst = join(targetDir, file);
    copyFileSync(src, dst);
    report.copied += 1;
  }

  for (const placeholder of PLACEHOLDER_GAMES) {
    const dst = join(targetDir, `${placeholder.slug}.json`);
    if (existsSync(dst)) continue; // idempotent: don't overwrite a real one
    const data = {
      id: `game-${placeholder.slug}`,
      slug: placeholder.slug,
      type: placeholder.type,
      title: placeholder.title,
      titleEs: placeholder.titleEs,
      description: placeholder.description,
      rounds: [],
      _placeholder: true,
    };
    writeFileSync(dst, JSON.stringify(data, null, 2));
    report.placeholders += 1;
  }

  return report;
}
