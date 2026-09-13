/**
 * Pronunciation scoring — pure functions, fully unit-tested.
 *
 * Compares an expected sentence with a speech-recognition transcript
 * at word level (case/punctuation insensitive) using Levenshtein
 * distance: accuracy = 1 − distance / max(len).
 */

export function normalizeSpeech(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

export function levenshteinWords(a: string[], b: string[]): number {
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j] ?? 0;
      const ai = a[i - 1] ?? '';
      const bj = b[j - 1] ?? '';
      prev[j] = Math.min(temp + 1, (prev[j - 1] ?? 0) + 1, diag + (ai === bj ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length] ?? 0;
}

export interface SpeechScore {
  /** 0-1 word accuracy. */
  accuracy: number;
  matched: number;
  total: number;
}

export function speechScore(expected: string, actual: string): SpeechScore {
  const e = normalizeSpeech(expected);
  const a = normalizeSpeech(actual);
  if (e.length === 0) return { accuracy: a.length === 0 ? 1 : 0, matched: 0, total: 0 };
  if (a.length === 0) return { accuracy: 0, matched: 0, total: e.length };
  const distance = levenshteinWords(e, a);
  const accuracy = Math.max(0, 1 - distance / Math.max(e.length, a.length));
  return { accuracy, matched: Math.max(0, e.length - distance), total: e.length };
}

/** Pass threshold for "well said" feedback. */
export const SPEAKING_PASS_THRESHOLD = 0.7;
