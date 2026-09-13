/**
 * Episode markdown parsing — pure functions, fully unit-tested.
 *
 * Handles both vocab table formats found in the corpus:
 *   | English | Spanish | Note |            (arcs 01-02)
 *   | English | Pronunciation | Spanish | (arcs 03-06)
 * plus `## Comprehension quiz` blocks, the SRS vocab list, and
 * dialogue lines for speaking practice.
 */

export interface VocabTerm {
  term: string;
  translation: string;
  note?: string;
}

export interface EpisodeQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

function splitRow(row: string): string[] {
  // '| a | b |' -> ['', ' a ', ' b ', ''] — trim each cell.
  return row.split('|').map((c) => c.trim());
}

export function extractVocabTerms(markdown: string): VocabTerm[] {
  const terms: VocabTerm[] = [];
  // Match any table whose header contains an English column.
  const tableRegex = /^\|(.+)\|\s*$\n\|[|\s:-]+\|\s*$(?:\n\|.*\|?\s*$)*/gm;
  for (const match of markdown.matchAll(tableRegex)) {
    const lines = match[0].split('\n').filter((l) => l.trim().startsWith('|'));
    if (lines.length < 2) continue;
    const header = splitRow(lines[0] ?? '');
    // header cells: ['', 'English', 'Spanish'|'Pronunciation', ...]
    const cols = header.slice(1, -1).map((c) => c.toLowerCase());
    const enIdx = cols.indexOf('english');
    if (enIdx < 0) continue;
    const esIdx = cols.indexOf('spanish');
    let noteIdx = cols.indexOf('note');
    if (esIdx < 0) continue; // not a vocab table
    if (noteIdx < 0) {
      const pronIdx = cols.indexOf('pronunciation');
      if (pronIdx >= 0 && pronIdx !== esIdx) noteIdx = pronIdx;
    }
    for (const row of lines.slice(2)) {
      if (/^\|[\s|-]+\|$/.test(row.trim())) continue; // separator
      const cells = splitRow(row).slice(1, -1);
      const term = cells[enIdx]?.trim() ?? '';
      const translation = cells[esIdx]?.trim() ?? '';
      if (!term || !translation) continue;
      // Skip the header row itself if it slipped through.
      if (term.toLowerCase() === 'english') continue;
      terms.push({
        term,
        translation,
        note: noteIdx >= 0 ? cells[noteIdx]?.trim() || undefined : undefined,
      });
    }
  }

  // Bullet vocab lists: `- **"term"** = translation` (some episodes).
  const bulletRegex = /^-\s+\*\*"([^"]+)"\*\*\s*=\s*(.+?)\s*$/gm;
  for (const bullet of markdown.matchAll(bulletRegex)) {
    const term = (bullet[1] ?? '').trim();
    const translation = (bullet[2] ?? '').trim();
    if (!term || !translation) continue;
    if (terms.some((t) => t.term.toLowerCase() === term.toLowerCase())) continue;
    terms.push({ term, translation });
  }

  return terms;
}

export function extractEpisodeQuiz(markdown: string): EpisodeQuizQuestion[] {
  const section = /## Comprehension quiz[\s\S]*?(?=^## |^---$)/m.exec(markdown);
  if (!section) return [];
  const body = section[0];

  // Answers line: "1. Flat white · 2. Croissant · ..."
  const answers: Record<number, string> = {};
  const answersMatch = /### Answers\s*\n([\s\S]*?)(?=\n## |\n---|$)/.exec(body);
  if (answersMatch) {
    for (const part of (answersMatch[1] ?? '').split('·')) {
      const m = /^\s*(\d+)\.\s*(.+?)\s*$/.exec(part);
      if (m) answers[Number(m[1])] = m[2] ?? '';
    }
  }

  const questions: EpisodeQuizQuestion[] = [];
  const qRegex = /^(\d+)\.\s+\*\*(.+?)\*\*\s*$/gm;
  for (const qm of body.matchAll(qRegex)) {
    const num = Number(qm[1]);
    // Options follow until the next numbered question or ### Answers.
    const rest = body.slice(qm.index + qm[0].length);
    const end = rest.search(/^\d+\.\s+\*\*|^### /m);
    const block = end >= 0 ? rest.slice(0, end) : rest;
    const options = [...block.matchAll(/^ +- \[ \] (.+?)\s*$/gm)].map((o) => (o[1] ?? '').trim());
    if (options.length === 0) continue;
    const answer = (answers[num] ?? '').toLowerCase();
    let correctIndex = options.findIndex((o) => o.toLowerCase() === answer);
    if (correctIndex < 0) correctIndex = 0;
    questions.push({ question: (qm[2] ?? '').trim(), options, correctIndex });
  }
  return questions;
}

/** Curated SRS word list under `## Vocabulary that goes to your SRS`. */
export function extractSrsWordList(markdown: string): string[] {
  const section = /## Vocabulary that goes to your SRS[\s\S]*?(?=^## |^---$)/m.exec(markdown);
  if (!section) return [];
  const words: string[] = [];
  for (const line of section[0].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    for (const w of trimmed
      .replace(/^-\s*/, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      words.push(w);
    }
  }
  return [...new Set(words)];
}

/** Dialogue quotes `> **Speaker:** "line"` for speaking practice. */
export function extractDialogueLines(markdown: string, max = 8): DialogueLine[] {
  const out: DialogueLine[] = [];
  const regex = /^>\s+\*\*([^*]+?):\*\*\s+"([^"]+)"\s*$/gm;
  for (const m of markdown.matchAll(regex)) {
    if (out.length >= max) break;
    const speaker = (m[1] ?? '').trim();
    const text = (m[2] ?? '').trim();
    if (speaker.toLowerCase() === 'narrator' || text.length < 12) continue;
    out.push({ speaker, text });
  }
  return out;
}

/**
 * Remove the interactive sections (quiz + answers + SRS list) from the
 * story body — they render as dedicated tabs instead of spoilers.
 */
export function stripInteractiveSections(markdown: string): string {
  return markdown
    .replace(/## Comprehension quiz[\s\S]*?(?=^## |^---$)/m, '')
    .replace(/## Vocabulary that goes to your SRS[\s\S]*?(?=^## |^---$)/m, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
