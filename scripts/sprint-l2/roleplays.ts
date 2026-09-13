/**
 * Sprint L2 roleplays → @academy/content.
 *
 * Reads the 18 roleplay JSON files from `content/roleplays/*.json` and
 * writes them as-is to `packages/content/src/english/roleplays/*.json`.
 *
 * The roleplays already have a stable schema (id, level, title, etc.)
 * defined by the source; we just relocate them and validate the
 * minimum required fields.
 *
 * Idempotent: overwrites files. Skips files that don't have the
 * required `id` field.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface RoleplayImportReport {
  copied: number;
  skipped: number;
  warnings: string[];
}

export interface RoleplayImportOptions {
  source: string;
  target: string;
}

const REQUIRED_FIELDS = ['id', 'title', 'level', 'objectives', 'vocabulary', 'greeting'] as const;

export function importRoleplays(opts: RoleplayImportOptions): RoleplayImportReport {
  const sourceDir = resolve(opts.source, 'content', 'roleplays');
  const targetDir = resolve(opts.target, 'english', 'roleplays');
  const report: RoleplayImportReport = { copied: 0, skipped: 0, warnings: [] };

  if (!existsSync(sourceDir)) {
    throw new Error(`Sprint L2 roleplays dir not found at ${sourceDir}`);
  }

  mkdirSync(targetDir, { recursive: true });

  for (const file of readdirSync(sourceDir).sort()) {
    if (!file.endsWith('.json')) continue;
    if (file === 'schema.json' || file === 'index.json') continue;
    const src = join(sourceDir, file);
    const dst = join(targetDir, file);

    // Validate by reading and checking the JSON.
    // We use a dynamic require since the source may be large.
    let data: unknown;
    try {
      const fs = require('node:fs') as typeof import('node:fs');
      data = JSON.parse(fs.readFileSync(src, 'utf8'));
    } catch (err) {
      report.warnings.push(`${file}: failed to parse (${(err as Error).message})`);
      report.skipped += 1;
      continue;
    }
    if (typeof data !== 'object' || data === null) {
      report.warnings.push(`${file}: not an object`);
      report.skipped += 1;
      continue;
    }
    const obj = data as Record<string, unknown>;
    const missing = REQUIRED_FIELDS.filter((f) => !(f in obj));
    if (missing.length > 0) {
      report.warnings.push(`${file}: missing fields ${missing.join(', ')}`);
      report.skipped += 1;
      continue;
    }
    copyFileSync(src, dst);
    report.copied += 1;
  }

  return report;
}
