#!/usr/bin/env node
/**
 * RedLab v6 → @academy/content importer.
 *
 * Usage:
 *   pnpm --filter @academy/content tsx scripts/import-redlab.ts \
 *     --source ../redlab \
 *     --target packages/content/src
 *
 * Run from the monorepo root for the default paths.
 */
import { importRedlab } from './redlab/importer.js';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
function getArg(name: string, fallback?: string): string {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < args.length) return args[i + 1] as string;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required --${name}`);
}

const source = resolve(getArg('source', '../redlab'));
const target = resolve(getArg('target', 'packages/content/src'));
const dryRun = args.includes('--dry-run');

console.log(`Importing RedLab content…`);
console.log(`  source: ${source}`);
console.log(`  target: ${target}`);

const report = importRedlab({ source, target, dryRun });

console.log('');
console.log('=== Migration report ===');
console.log(`  lessons:      ${report.lessonsWritten}`);
console.log(`  labs:         ${report.labsWritten}`);
console.log(`  projects:     ${report.projectsWritten}`);
console.log(`  exams:        ${report.examsWritten}`);
console.log(`  achievements: ${report.achievementsWritten}`);

if (report.warnings.length > 0) {
  console.log('');
  console.log(`Warnings (${report.warnings.length}):`);
  for (const w of report.warnings.slice(0, 30)) {
    console.log(`  ⚠ ${w}`);
  }
  if (report.warnings.length > 30) {
    console.log(`  …and ${report.warnings.length - 30} more`);
  }
}
