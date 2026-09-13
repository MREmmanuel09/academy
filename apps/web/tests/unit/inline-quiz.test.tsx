import { InlineQuiz, parseInlineQuizzes } from '@/components/inline-quiz';
import type { QuizQuestion } from '@/components/inline-quiz';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...filterDomProps(props)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

function filterDomProps(props: Record<string, unknown>) {
  const dom: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (
      key.startsWith('on') ||
      key === 'className' ||
      key === 'style' ||
      key === 'role' ||
      key.startsWith('aria-')
    ) {
      dom[key] = props[key];
    }
  }
  return dom;
}

describe('parseInlineQuizzes', () => {
  it('extracts quiz blocks from markdown', () => {
    const md = `# Lesson
Some text.

:::quiz
[{"question":"What is 2+2?","options":["3","4","5"],"correctIndex":1}]
:::

More text.
`;
    const result = parseInlineQuizzes(md);
    expect(result.quizzes).toHaveLength(1);
    expect(result.quizzes[0]).toHaveLength(1);
    expect(result.quizzes[0]?.[0]?.question).toBe('What is 2+2?');
    expect(result.cleanMarkdown).toContain('<!--quiz-0-->');
    expect(result.cleanMarkdown).not.toContain(':::quiz');
  });

  it('extracts multiple quiz blocks', () => {
    const md = `:::quiz
[{"question":"Q1","options":["a","b"],"correctIndex":0}]
:::

Text.

:::quiz
[{"question":"Q2","options":["c","d"],"correctIndex":1}]
:::
`;
    const result = parseInlineQuizzes(md);
    expect(result.quizzes).toHaveLength(2);
    expect(result.quizzes[0]?.[0]?.question).toBe('Q1');
    expect(result.quizzes[1]?.[0]?.question).toBe('Q2');
  });

  it('returns empty for no quizzes', () => {
    const md = 'Just plain text.';
    const result = parseInlineQuizzes(md);
    expect(result.quizzes).toHaveLength(0);
    expect(result.cleanMarkdown).toBe(md);
  });

  it('skips invalid JSON in quiz blocks', () => {
    const md = `:::quiz
not valid json
:::
`;
    const result = parseInlineQuizzes(md);
    expect(result.quizzes).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    const result = parseInlineQuizzes('');
    expect(result.quizzes).toHaveLength(0);
    expect(result.cleanMarkdown).toBe('');
  });
});

// InlineQuiz component tests need a full DOM
describe('InlineQuiz component', () => {
  const questions: QuizQuestion[] = [
    {
      question: 'Capital of France?',
      options: ['London', 'Paris', 'Berlin'],
      correctIndex: 1,
      explanation: 'Paris is the capital.',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders first question', async () => {
    await act(async () => {
      render(<InlineQuiz questions={questions} />);
    });
    expect(screen.getByText('Capital of France?')).toBeDefined();
  });

  it('calls onComplete after answering all questions', async () => {
    const onComplete = vi.fn();
    await act(async () => {
      render(<InlineQuiz questions={questions} onComplete={onComplete} />);
    });
    // Click correct answer
    const btns = screen.getAllByRole('button');
    const parisBtn = btns.find((b) => b.textContent?.includes('Paris'));
    expect(parisBtn).toBeDefined();
    fireEvent.click(parisBtn ?? document.body);
    // Click "Check Answer"
    const checkBtn = screen.getByText(/Check Answer/i);
    fireEvent.click(checkBtn);
    // Click "Next Question →" (single question, so it's the last)
    const nextBtn = screen.getByText(/Next Question|See Results/i);
    fireEvent.click(nextBtn);
    expect(onComplete).toHaveBeenCalled();
    const score = onComplete.mock.calls[0]?.[0] as number | undefined;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
