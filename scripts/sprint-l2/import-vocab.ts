/**
 * Sprint L2 vocab → @academy/db `vocab` table.
 *
 * Reads `public/vocab.json` (805 entries) and upserts each into the
 * `vocab` table, keyed by `term_en` (the English lemma).
 *
 * Idempotency strategy:
 *   - Look up the existing row by `term_en`.
 *   - If found, update the Spanish fields and `frequency_rank`.
 *   - If not, insert a new row with a fresh UUID.
 *
 * The `audio_url` field is left null — the TTS audio is copied to
 * `apps/web/public/audio/vocab/` by a separate copy step (out of
 * scope for this script).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb, type SqliteDb, schema } from '@academy/db';

export interface VocabImportReport {
  inserted: number;
  updated: number;
  skipped: number;
  warnings: string[];
  total: number;
}

export interface VocabImportOptions {
  source: string; // path to public/vocab.json
  /** When true, do not write to the DB. Used by tests. */
  dryRun?: boolean;
}

interface VocabEntry {
  lemma: string;
  translation: string;
  exampleEn: string;
  exampleEs: string;
  frequencyRank: number;
  tags: string;
}

export async function importVocab(opts: VocabImportOptions): Promise<VocabImportReport> {
  const report: VocabImportReport = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
    total: 0,
  };

  const file = resolve(opts.source);
  let entries: VocabEntry[];
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    if (!Array.isArray(raw)) {
      throw new Error('vocab.json is not an array');
    }
    entries = raw as VocabEntry[];
  } catch (err) {
    report.warnings.push(`failed to read ${file}: ${(err as Error).message}`);
    return report;
  }
  report.total = entries.length;

  if (opts.dryRun) {
    return report;
  }

  const db = getDb() as SqliteDb;

  for (const entry of entries) {
    if (!entry.lemma || !entry.translation) {
      report.skipped += 1;
      report.warnings.push(`entry without lemma/translation: ${JSON.stringify(entry).slice(0, 80)}`);
      continue;
    }

    // Look up by term_en (the English lemma, unique).
    const [existing] = await db
      .select()
      .from(schema.vocab)
      .where(eq(schema.vocab.termEn, entry.lemma))
      .limit(1);

    const partOfSpeech = inferPartOfSpeech(entry.tags);
    const values = {
      term: entry.lemma,
      termEn: entry.lemma,
      translation: entry.translation,
      translationEs: entry.translation,
      partOfSpeech,
      definitionEn: null,
      definitionEs: null,
      exampleEn: entry.exampleEn,
      exampleEs: entry.exampleEs,
      audioUrl: null,
      arcSlug: null,
      episodeSlug: null,
    };

    if (existing) {
      await db
        .update(schema.vocab)
        .set(values)
        .where(eq(schema.vocab.id, existing.id));
      report.updated += 1;
    } else {
      await db.insert(schema.vocab).values(values);
      report.inserted += 1;
    }
  }

  return report;
}

/**
 * Best-effort inference of `part_of_speech` from the comma-separated
 * `tags` string. The Sprint L2 tags are loose ("noun", "verb", etc.
 * or "article,function" for multi). The schema's enum is restrictive,
 * so we default to 'other' when in doubt.
 */
function inferPartOfSpeech(tags: string): 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other' {
  const t = tags.toLowerCase();
  if (t.includes('noun')) return 'noun';
  if (t.includes('verb')) return 'verb';
  if (t.includes('adjective') || t.includes('adj')) return 'adjective';
  if (t.includes('adverb') || t.includes('adv')) return 'adverb';
  if (t.includes('phrase') || t.includes('idiom')) return 'phrase';
  return 'other';
}

// CLI entry point.
function parseArgs(argv: readonly string[]): VocabImportOptions {
  let source = '';
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') {
      source = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }
  if (!source) {
    throw new Error('Usage: import-vocab.ts --source <vocab.json> [--dry-run]');
  }
  return { source, dryRun };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  importVocab(opts)
    .then((r) => {
      console.log(
        `Vocab import: ${r.inserted} inserted, ${r.updated} updated, ${r.skipped} skipped (total ${r.total})`,
      );
      if (r.warnings.length > 0) {
        for (const w of r.warnings.slice(0, 20)) console.log(`  ⚠ ${w}`);
      }
    })
    .catch((err) => {
      console.error('Vocab import failed:', err);
      process.exit(1);
    });
}
