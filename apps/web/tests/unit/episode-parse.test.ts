import {
  extractDialogueLines,
  extractEpisodeQuiz,
  extractSrsWordList,
  extractVocabTerms,
  stripInteractiveSections,
} from '@/lib/episode-parse';
import { describe, expect, it } from 'vitest';

const SAMPLE = `# Episode X

## Scene 1

> **Maria:** "Hi! Can I have a flat white, please?"

> **Narrator:** "She smiles warmly at the busy room."

> **Barista:** "Sure thing! Coming right up."

### Vocabulario emergente

| English | Spanish | Note |
|---|---|---|
| flat white | café con leche | (specific) |
| latte | café con leche | |

### Other table

| English | Pronunciation | Spanish |
|---|---|---|
| to draft | /drɑːft/ | redactar |
| proposal | /prəˈpəʊzəl/ | propuesta |

## Comprehension quiz (3 min)

1. **What did Maria order?**
   - [ ] Latte
   - [ ] Flat white
   - [ ] Tea
   - [ ] Nothing

2. **Who served her?**
   - [ ] Maria
   - [ ] The barista
   - [ ] Nobody
   - [ ] A friend

### Answers

1. Flat white · 2. The barista

---

## Vocabulary that goes to your SRS

8 new items:
- flat white, latte
- to draft, proposal

---

## Self-assessment

- [ ] Can order coffee?
`;

describe('extractVocabTerms', () => {
  it('parses English|Spanish|Note tables', () => {
    const terms = extractVocabTerms(SAMPLE);
    expect(terms).toContainEqual({
      term: 'flat white',
      translation: 'café con leche',
      note: '(specific)',
    });
    expect(terms).toContainEqual({ term: 'latte', translation: 'café con leche', note: undefined });
  });

  it('parses English|Pronunciation|Spanish tables', () => {
    const terms = extractVocabTerms(SAMPLE);
    expect(terms).toContainEqual({ term: 'to draft', translation: 'redactar', note: '/drɑːft/' });
    expect(terms).toHaveLength(4);
  });

  it('returns empty when no vocab tables exist', () => {
    expect(extractVocabTerms('# Hello\n\nNo tables here.')).toEqual([]);
  });

  it('parses bullet vocab lists', () => {
    const md =
      '## Scene\n\n- **"Get my head straight"** = aclarar mi cabeza\n- **"Past error"** = error pasado\n';
    expect(extractVocabTerms(md)).toEqual([
      { term: 'Get my head straight', translation: 'aclarar mi cabeza', note: undefined },
      { term: 'Past error', translation: 'error pasado', note: undefined },
    ]);
  });
});

describe('extractEpisodeQuiz', () => {
  it('extracts questions with options and answer key', () => {
    const quiz = extractEpisodeQuiz(SAMPLE);
    expect(quiz).toHaveLength(2);
    expect(quiz[0]).toEqual({
      question: 'What did Maria order?',
      options: ['Latte', 'Flat white', 'Tea', 'Nothing'],
      correctIndex: 1,
    });
    expect(quiz[1]?.correctIndex).toBe(1);
  });

  it('returns empty when no quiz section exists', () => {
    expect(extractEpisodeQuiz('# Hello')).toEqual([]);
  });
});

describe('extractSrsWordList', () => {
  it('collects comma-separated words', () => {
    expect(extractSrsWordList(SAMPLE)).toEqual(['flat white', 'latte', 'to draft', 'proposal']);
  });
});

describe('extractDialogueLines', () => {
  it('extracts speaker lines, skipping the narrator and short lines', () => {
    const lines = extractDialogueLines(SAMPLE);
    expect(lines).toEqual([
      { speaker: 'Maria', text: 'Hi! Can I have a flat white, please?' },
      { speaker: 'Barista', text: 'Sure thing! Coming right up.' },
    ]);
  });
});

describe('stripInteractiveSections', () => {
  it('removes quiz and SRS sections but keeps the story', () => {
    const stripped = stripInteractiveSections(SAMPLE);
    expect(stripped).not.toContain('Comprehension quiz');
    expect(stripped).not.toContain('### Answers');
    expect(stripped).not.toContain('goes to your SRS');
    expect(stripped).toContain('## Scene 1');
    expect(stripped).toContain('## Self-assessment');
  });
});
