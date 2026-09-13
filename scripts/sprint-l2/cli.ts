/**
 * CLI entry point for all Sprint L2 importers.
 *
 *   # Episodes (markdown)
 *   tsx scripts/import-sprint-l2.ts episodes --source <sprint-l2-src> --target packages/content/src
 *
 *   # Roleplays
 *   tsx scripts/import-sprint-l2.ts roleplays --source <sprint-l2-src> --target packages/content/src
 *
 *   # Games
 *   tsx scripts/import-sprint-l2.ts games --source <sprint-l2-src> --target packages/content/src
 *
 *   # i18n
 *   tsx scripts/import-sprint-l2.ts i18n --source <sprint-l2-src>/src/lib/i18n.ts --target packages/i18n/src/messages
 *
 *   # Vocab (DB)
 *   tsx scripts/import-sprint-l2.ts vocab --source <sprint-l2-src>/public/vocab.json
 */
import { importEpisodes, type EpisodeImportOptions } from './episodes.js';
import { importRoleplays, type RoleplayImportOptions } from './roleplays.js';
import { importGames, type GameImportOptions } from './games.js';
import { importI18n, type I18nImportOptions } from './i18n-extract.js';
import { importVocab, type VocabImportOptions } from './import-vocab.js';
import { resolve } from 'node:path';

type Subcommand = 'episodes' | 'roleplays' | 'games' | 'i18n' | 'vocab' | 'all';

function getArg(args: string[], name: string, fallback?: string): string {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < args.length) return args[i + 1] as string;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required --${name}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sub = args[0] as Subcommand;
  const rest = args.slice(1);

  switch (sub) {
    case 'episodes': {
      const opts: EpisodeImportOptions = {
        source: resolve(getArg(rest, 'source', '../sprint-l2')),
        target: resolve(getArg(rest, 'target', 'packages/content/src')),
      };
      const r = importEpisodes(opts);
      console.log(`Episodes: ${r.episodes} imported across ${r.arcs} arcs.`);
      for (const w of r.warnings) console.log(`  ⚠ ${w}`);
      break;
    }
    case 'roleplays': {
      const opts: RoleplayImportOptions = {
        source: resolve(getArg(rest, 'source', '../sprint-l2')),
        target: resolve(getArg(rest, 'target', 'packages/content/src')),
      };
      const r = importRoleplays(opts);
      console.log(`Roleplays: ${r.copied} copied, ${r.skipped} skipped.`);
      for (const w of r.warnings) console.log(`  ⚠ ${w}`);
      break;
    }
    case 'games': {
      const opts: GameImportOptions = {
        source: resolve(getArg(rest, 'source', '../sprint-l2')),
        target: resolve(getArg(rest, 'target', 'packages/content/src')),
      };
      const r = importGames(opts);
      console.log(`Games: ${r.copied} copied, ${r.placeholders} placeholders.`);
      for (const w of r.warnings) console.log(`  ⚠ ${w}`);
      break;
    }
    case 'i18n': {
      const opts: I18nImportOptions = {
        source: resolve(getArg(rest, 'source', '../sprint-l2/src/lib/i18n.ts')),
        target: resolve(getArg(rest, 'target', 'packages/i18n/src/messages')),
      };
      const r = importI18n(opts);
      console.log(`i18n: ${r.locales} locales.`);
      for (const [loc, n] of Object.entries(r.keys)) {
        console.log(`  ${loc}: ${n} keys`);
      }
      for (const w of r.warnings) console.log(`  ⚠ ${w}`);
      break;
    }
    case 'vocab': {
      const opts: VocabImportOptions = {
        source: resolve(getArg(rest, 'source', '../sprint-l2/public/vocab.json')),
        dryRun: rest.includes('--dry-run'),
      };
      const r = await importVocab(opts);
      console.log(
        `Vocab: ${r.inserted} inserted, ${r.updated} updated, ${r.skipped} skipped (total ${r.total})`,
      );
      for (const w of r.warnings.slice(0, 20)) console.log(`  ⚠ ${w}`);
      break;
    }
    case 'all': {
      // Run everything except vocab (DB) in order.
      const source = resolve(getArg(rest, 'source', '../sprint-l2'));
      const target = resolve(getArg(rest, 'target', 'packages/content/src'));
      const msgs = resolve(getArg(rest, 'target', 'packages/i18n/src/messages'));
      console.log('=== Episodes ===');
      const e = importEpisodes({ source, target });
      console.log(`  ${e.episodes} episodes / ${e.arcs} arcs`);
      console.log('=== Roleplays ===');
      const r = importRoleplays({ source, target });
      console.log(`  ${r.copied} roleplays`);
      console.log('=== Games ===');
      const g = importGames({ source, target });
      console.log(`  ${g.copied} games + ${g.placeholders} placeholders`);
      console.log('=== i18n ===');
      const i = importI18n({ source: resolve(source, 'src/lib/i18n.ts'), target: msgs });
      console.log(`  ${i.locales} locales`);
      break;
    }
    default:
      throw new Error(
        `Unknown subcommand: ${sub}. Use one of: episodes | roleplays | games | i18n | vocab | all`,
      );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
