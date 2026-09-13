import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getExamDefinition, getQuestionDetail, getQuestionDetails } from '@/lib/quiz-content';
import { clearCache, setContentRoot } from '@academy/content';
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  // Minimal content tree: one global exam + two questions (multiple +
  // true/false). Unique ids avoid the module-level FS/DB caches.
  const root = mkdtempSync(join(tmpdir(), 'academy-quiz-'));
  mkdirSync(join(root, 'exams'), { recursive: true });
  mkdirSync(join(root, 'questions'), { recursive: true });
  writeFileSync(
    join(root, 'exams', 'exam-t1.json'),
    JSON.stringify({
      id: 'exam-t1',
      title: 'Test exam',
      description: 'd',
      totalQuestions: 2,
      passingScore: 80,
      xp: 10,
      questionIds: ['q-t1-a', 'q-t1-b'],
    }),
  );
  writeFileSync(
    join(root, 'questions', 'q-t1-a.json'),
    JSON.stringify({
      id: 'q-t1-a',
      quizId: 'exam-t1',
      type: 'multiple',
      prompt: 'What is 2+2?',
      options: [
        { id: '0', text: '3' },
        { id: '1', text: '4' },
      ],
      correctAnswer: '1',
      explanation: 'Basic arithmetic.',
      irtA: 1.1,
      irtB: 0.5,
      irtC: 0.25,
    }),
  );
  writeFileSync(
    join(root, 'questions', 'q-t1-b.json'),
    JSON.stringify({
      id: 'q-t1-b',
      quizId: 'exam-t1',
      type: 'truefalse',
      prompt: 'The sky is blue.',
      options: null,
      correctAnswer: 'true',
      explanation: 'Rayleigh scattering.',
      irtA: 0.9,
      irtB: -0.5,
      irtC: 0.25,
    }),
  );
  clearCache();
  setContentRoot(root);
});

describe('quiz-content filesystem fallback', () => {
  it('loads an exam definition from global exams/', async () => {
    const def = await getExamDefinition('exam-t1');
    expect(def?.id).toBe('exam-t1');
    expect(def?.questionIds).toEqual(['q-t1-a', 'q-t1-b']);
    expect(def?.passingScore).toBe(80);
  });

  it('returns null for unknown exams', async () => {
    expect(await getExamDefinition('exam-nope-zzz')).toBeNull();
  });

  it('resolves option ids to text with calibrated IRT params', async () => {
    const q = await getQuestionDetail('q-t1-a');
    expect(q?.correct).toBe('4');
    expect(q?.options).toEqual(['3', '4']);
    expect(q?.explanation).toBe('Basic arithmetic.');
    expect(q?.a).toBeCloseTo(1.1);
    expect(q?.b).toBeCloseTo(0.5);
  });

  it('synthesizes true/false options', async () => {
    const q = await getQuestionDetail('q-t1-b');
    expect(q?.options).toEqual(['true', 'false']);
    expect(q?.correct).toBe('true');
  });

  it('loads batches preserving order and skipping missing', async () => {
    const out = await getQuestionDetails(['q-t1-b', 'q-missing-zzz', 'q-t1-a']);
    expect(out.map((q) => q.id)).toEqual(['q-t1-b', 'q-t1-a']);
  });
});
