/**
 * Field extractor for object literals produced by `parser.ts`.
 *
 * RedLab uses a small set of value patterns; this module handles them
 * with regex (no full TS/JSON parser). The output is `Record<string,
 * unknown>`; importers cast to the proper shapes.
 */
import { isRecord } from './parser.js';

/** Extract the value of a top-level field from an object literal. */
function extractField(body: string, name: string): string | null {
  // We look for `name:` preceded by `{`, `,`, or start of input,
  // and grab the value up to the next `,` or `}` at the same depth.
  const re = new RegExp(
    `(?:^|[{,]\\s*)${name}\\s*:\\s*`,
    'm',
  );
  const m = re.exec(body);
  if (!m) return null;
  const start = m.index + m[0].length;
  // Walk forward, tracking depth of ( [ { and string boundaries.
  let depth = 0;
  let inString: '"' | "'" | '`' | null = null;
  let escape = false;
  for (let i = start; i < body.length; i += 1) {
    const c = body[i];
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
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return body.slice(start, i);
      depth -= 1;
    } else if (c === ',' && depth === 0) {
      return body.slice(start, i);
    }
  }
  return body.slice(start);
}

/** Parse a string literal (single, double, or template) into its raw value. */
function unquote(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === 'undefined' || trimmed === 'null') return '';
  if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
    // Template literal — we just keep the inner text. Interpolations
    // (${...}) are not resolved by this parser; importers handle them
    // by treating them as opaque text.
    return trimmed.slice(1, -1);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
  return trimmed;
}

/** Parse a JSON-looking fragment: object or array literal. */
function parseJsonish(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    // Array of literals. For RedLab data this is usually `string[]` or
    // `number[]`; we support both.
    const inner = trimmed.slice(1, -1).trim();
    if (inner === '') return [];
    // Split on top-level commas (depth 0, not in string).
    const items: unknown[] = [];
    let depth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let escape = false;
    let start = 0;
    for (let i = 0; i < inner.length; i += 1) {
      const c = inner[i];
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
      if (c === '[' || c === '{' || c === '(') depth += 1;
      else if (c === ']' || c === '}' || c === ')') depth -= 1;
      else if (c === ',' && depth === 0) {
        const frag = inner.slice(start, i).trim();
        if (frag) items.push(parseJsonish(frag));
        start = i + 1;
      }
    }
    const last = inner.slice(start).trim();
    if (last) items.push(parseJsonish(last));
    return items;
  }
  if (trimmed.startsWith('{')) {
    // Object literal — parse as a flat record of literal values.
    const out: Record<string, unknown> = {};
    const inner = trimmed.slice(1, -1);
    // Split on top-level commas outside strings.
    let depth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let escape = false;
    let buf = '';
    const pairs: string[] = [];
    for (let i = 0; i < inner.length; i += 1) {
      const c = inner[i];
      if (escape) {
        escape = false;
        buf += c;
        continue;
      }
      if (c === '\\' && inString) {
        escape = true;
        buf += c;
        continue;
      }
      if (inString) {
        if (c === inString) inString = null;
        buf += c;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inString = c;
        buf += c;
        continue;
      }
      if (c === '[' || c === '{' || c === '(') {
        depth += 1;
        buf += c;
        continue;
      }
      if (c === ']' || c === '}' || c === ')') {
        depth -= 1;
        buf += c;
        continue;
      }
      if (c === ',' && depth === 0) {
        pairs.push(buf);
        buf = '';
        continue;
      }
      buf += c;
    }
    if (buf.trim()) pairs.push(buf);
    for (const pair of pairs) {
      const colon = findTopLevelColon(pair);
      if (colon < 0) continue;
      const key = pair.slice(0, colon).trim().replace(/^['"]|['"]$/g, '');
      const value = parseJsonish(pair.slice(colon + 1));
      if (key) out[key] = value;
    }
    return out;
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return unquote(trimmed);
}

function findTopLevelColon(s: string): number {
  let inString: '"' | "'" | '`' | null = null;
  let escape = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
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
    if (c === ':') return i;
  }
  return -1;
}

/**
 * Convert a single RedLab object literal (text) into a flat record of
 * parsed values. Only fields explicitly listed in `wanted` are included.
 *
 * For function-typed fields (e.g. `check: (s) => ...`), the value is
 * stored as the raw source text so the importer can decide what to do
 * (typically skip it or transpile it).
 */
export function parseObject(
  body: string,
  wanted: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of wanted) {
    const raw = extractField(body, key);
    if (raw === null) continue;
    const trimmed = raw.trim();
    if (trimmed.startsWith('(') || trimmed.startsWith('function')) {
      out[key] = { __opaque: trimmed };
    } else {
      out[key] = parseJsonish(trimmed);
    }
  }
  return out;
}

export { isRecord };
