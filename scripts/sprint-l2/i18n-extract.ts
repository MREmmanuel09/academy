/**
 * Extract the 9 Sprint L2 UI translations from `src/lib/i18n.ts` and
 * write them to `packages/i18n/src/messages/<locale>.json` in
 * next-intl-compatible format.
 *
 * ## Strategy
 *
 * The Sprint L2 source uses an in-memory TranslationKeys object keyed
 * by a flat `L1Code`. We re-parse the source as text (no import), find
 * each `const XX: TranslationKeys = { ... }` block, and write it to
 * the corresponding message file.
 *
 * Locales that fall back to EN in the source (de, it, pl, zh, ja, ar)
 * are written as a copy of the EN file. The next-intl runtime will
 * load the right one based on the user preference.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface I18nImportReport {
  locales: number;
  keys: Record<string, number>;
  warnings: string[];
}

export interface I18nImportOptions {
  source: string; // sprint-l2/src/lib/i18n.ts
  target: string; // packages/i18n/src/messages
}

export function importI18n(opts: I18nImportOptions): I18nImportReport {
  const file = resolve(opts.source);
  const targetDir = resolve(opts.target);
  const report: I18nImportReport = { locales: 0, keys: {}, warnings: [] };

  if (!existsSync(file)) {
    throw new Error(`Sprint L2 i18n file not found at ${file}`);
  }

  const src = readFileSync(file, 'utf8');
  // First, extract the EN block (always present and complete).
  const en = extractLocale(src, 'EN');
  if (!en) {
    report.warnings.push('EN translation block not found in source');
    return report;
  }
  writeLocale(targetDir, 'en', en);
  report.locales += 1;
  report.keys.en = Object.keys(en).length;

  // Then the local overrides for es, pt, fr. The source uses `...EN`
  // spread at the top of each block, so we need to merge them.
  for (const locale of ['es', 'pt', 'fr'] as const) {
    const partial = extractLocale(src, locale.toUpperCase());
    if (!partial) {
      report.warnings.push(`${locale} translation block not found`);
      continue;
    }
    const merged = { ...en, ...partial };
    writeLocale(targetDir, locale, merged);
    report.locales += 1;
    report.keys[locale] = Object.keys(merged).length;
  }

  // Fallbacks: de, it, pl, zh, ja, ar. These use `EN` in the source,
  // so we copy the EN file for each. The Spanish brand name might
  // differ but the UI strings are identical.
  for (const locale of ['de', 'it', 'pl', 'zh', 'ja', 'ar'] as const) {
    const partial = extractLocale(src, locale.toUpperCase());
    const merged = partial ? { ...en, ...partial } : en;
    writeLocale(targetDir, locale, merged);
    report.locales += 1;
    report.keys[locale] = Object.keys(merged).length;
  }

  return report;
}

/**
 * Find the `const XX: TranslationKeys = { ... };` block in the source
 * and return the keys/values as a flat record. We rely on brace
 * counting to find the closing brace.
 */
function extractLocale(src: string, name: string): Record<string, string> | null {
  const re = new RegExp(`const ${name}:\\s*TranslationKeys\\s*=\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  // Walk forward to the matching closing brace.
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }
  if (depth !== 0) return null;
  const body = src.slice(start, i);
  return parseObjectLiteral(body);
}

/**
 * Parse a flat object literal (no nested objects) into key/value
 * pairs. Values are string literals (single, double, or template).
 * Keys may be quoted or unquoted (TS allows both). Spread operators
 * (`...EN`) and line comments are skipped. A safety counter caps the
 * loop at 100k iterations to fail fast on any infinite loop bug.
 */
function parseObjectLiteral(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  let safety = 0;
  while (i < body.length) {
    if (++safety > 100_000) break;
    // Skip whitespace.
    while (i < body.length && /\s/.test(body[i] ?? '')) i += 1;
    if (i >= body.length) break;

    // Spread operator `...XX`. Skip past the three dots, then read
    // the identifier.
    if (body[i] === '.' && body.slice(i, i + 3) === '...') {
      i += 3;
      while (i < body.length && /[A-Za-z0-9_]/.test(body[i] ?? '')) i += 1;
      continue;
    }

    // Line comment `//...`
    if (body[i] === '/' && body[i + 1] === '/') {
      while (i < body.length && body[i] !== '\n') i += 1;
      continue;
    }

    // Parse key. Either `name:` (unquoted) or `'name':` / `"name":`.
    let key = '';
    if (body[i] === "'" || body[i] === '"') {
      const keyEnd = findStringEnd(body, i);
      if (keyEnd < 0) break;
      key = body.slice(i + 1, keyEnd);
      i = keyEnd + 1;
    } else if (/[A-Za-z_]/.test(body[i] ?? '')) {
      const keyStart = i;
      while (i < body.length && /[A-Za-z0-9_]/.test(body[i] ?? '')) i += 1;
      key = body.slice(keyStart, i);
    } else {
      // Unknown token — skip one char and continue.
      i += 1;
      continue;
    }
    if (key === '') {
      i += 1;
      continue;
    }

    // Skip whitespace and the colon.
    while (i < body.length && (body[i] === ':' || /\s/.test(body[i] ?? ''))) i += 1;
    if (i >= body.length) break;

    // Parse value.
    if (body[i] === "'" || body[i] === '"') {
      const vStart = i + 1;
      const vEnd = findStringEnd(body, i);
      if (vEnd < 0) break;
      out[key] = decodeString(body.slice(vStart, vEnd));
      i = vEnd + 1;
    } else if (body[i] === '`') {
      let j = i + 1;
      while (j < body.length && body[j] !== '`') {
        if (body[j] === '\\') j += 2;
        else j += 1;
      }
      out[key] = decodeString(body.slice(i + 1, j));
      i = j + 1;
    } else {
      // Unknown value type — skip until next comma or closing brace.
      while (i < body.length && body[i] !== ',' && body[i] !== '}') i += 1;
    }
  }
  return out;
}

function findStringEnd(body: string, openIdx: number): number {
  const quote = body[openIdx];
  for (let i = openIdx + 1; i < body.length; i += 1) {
    if (body[i] === '\\') {
      i += 1;
      continue;
    }
    if (body[i] === quote) return i;
  }
  return -1;
}

function decodeString(s: string): string {
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function writeLocale(targetDir: string, locale: string, data: Record<string, string>): void {
  mkdirSync(targetDir, { recursive: true });
  // Wrap in a `common` namespace to match our Academy i18n shape
  // (common, home, nav, footer). Most Sprint L2 keys map to `common`.
  const wrapped = { common: data };
  writeFileSync(join(targetDir, `${locale}.json`), JSON.stringify(wrapped, null, 2));
}

// CLI entry point.
function parseArgs(argv: readonly string[]): I18nImportOptions {
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
      'Usage: i18n-extract.ts --source <i18n.ts> --target <messages-dir>',
    );
  }
  return { source, target };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  const report = importI18n(opts);
  console.log(`Imported ${report.locales} locales.`);
  for (const [loc, n] of Object.entries(report.keys)) {
    console.log(`  ${loc}: ${n} keys`);
  }
  if (report.warnings.length > 0) {
    console.log('Warnings:');
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  }
}
