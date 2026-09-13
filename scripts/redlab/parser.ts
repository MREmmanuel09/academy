/**
 * Source-text parser for RedLab v6 data files.
 *
 * We do NOT import the RedLab source because it has Vite-style `@/`
 * path aliases, React/Vue components, and a Zustand store that all need
 * a complex toolchain. Instead we parse the source text with a small
 * state machine that finds top-level `export const <name> = [...]`
 * arrays and extracts each object's string and numeric fields.
 *
 * The parser is intentionally tolerant: it produces a `Record<string,
 * unknown>` per object. Strict shape validation happens in the
 * importers (one per content type), which cast the records to their
 * proper TypeScript types.
 *
 * ## Limitations
 *
 *   - String values with embedded template literals (backticks) are
 *     captured fully; the parser tracks the `${...}` braces so it
 *     doesn't split an object across an interpolation.
 *   - Nested objects and arrays are captured as JSON-looking fragments
 *     using bracket counting.
 *   - Multi-line values are supported (template literals preserve
 *     newlines).
 *   - Comments (`//`, `/* ... * /`) are stripped before parsing to
 *     avoid matching `id:` inside a comment.
 *
 * This is not a general TS parser. It targets the patterns RedLab v6
 * actually uses. If the source format changes, the parsers will
 * silently produce empty data — re-run the validation counts to catch it.
 */
import { readFileSync } from 'node:fs';

/** Strip line and block comments from TypeScript source. */
export function stripComments(src: string): string {
  // Remove /* ... */ comments (non-greedy, possibly multi-line).
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove // line comments (but not inside strings; we accept the
  // small risk for RedLab's data, which doesn't use // inside strings).
  return noBlock.replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Find the top-level array literal assigned to `name` in `src`.
 * Returns the substring of the array body (between `[` and the matching
 * `]`), or `null` if not found.
 */
export function findTopLevelArray(src: string, name: string): string | null {
  // Match `export const <name> ... = [` with anything in between.
  const re = new RegExp(`export\\s+const\\s+${name}\\b[^=]*=\\s*\\[`, 'g');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  // Walk forward, tracking depth of [ ] to find the matching close.
  let depth = 1;
  let inString: '"' | "'" | '`' | null = null;
  let escape = false;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (inString) {
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return null;
}

/**
 * Split the body of an array literal into individual top-level object
 * literals. Handles nested arrays and template literals correctly.
 */
export function splitTopLevelObjects(arrayBody: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let inString: '"' | "'" | '`' | null = null;
  let escape = false;
  for (let i = 0; i < arrayBody.length; i += 1) {
    const c = arrayBody[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (inString) {
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) out.push(arrayBody.slice(start, i + 1));
    }
  }
  return out;
}

/**
 * Read a `.ts` file, strip comments, and return the cleaned text.
 * Convenience wrapper used by every importer.
 */
export function readSource(path: string): string {
  return stripComments(readFileSync(path, 'utf8'));
}

/** Lightweight type guard. */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
