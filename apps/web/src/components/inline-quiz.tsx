'use client';

import { Button, Card, CardContent } from '@academy/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface InlineQuizProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 150;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * 300,
      y: Math.random() * -100,
      w: 4 + Math.random() * 4,
      h: 6 + Math.random() * 4,
      color: ['#facc15', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'][Math.floor(Math.random() * 5)],
      vy: 1.5 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }));

    let frame = 0;
    let raf: number;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, 300, 150);
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color ?? '#000';
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (frame < 90) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 mx-auto"
      style={{ width: 300, height: 150 }}
    />
  );
}

export function InlineQuiz({ questions, onComplete }: InlineQuizProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = questions[current];
  if (!q) return null;

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
    setAnimating(true);
    if (selected === q.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
    setTimeout(() => setAnimating(false), 400);
  };

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      onComplete?.(correctCount);
    } else {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((c) => c + 1);
        setSelected(null);
        setRevealed(false);
        setAnimating(false);
      }, 200);
    }
  }, [current, questions.length, correctCount, onComplete]);

  const progress = ((current + (revealed ? 1 : 0)) / questions.length) * 100;

  if (finished) {
    const score = correctCount;
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const perfect = score === total;

    return (
      <Card className="my-6 relative overflow-hidden border-primary/30 bg-primary/5">
        {perfect && <Confetti />}
        <CardContent className="relative p-5 text-center space-y-3">
          <div className="text-3xl animate-[bounce_0.6s_ease-in-out]">
            {perfect ? '🎉' : score > total / 2 ? '👍' : '📚'}
          </div>
          <p className="text-xl font-bold">
            {score}/{total}
          </p>
          <p className="text-sm text-muted-foreground">
            {perfect
              ? 'Perfect score! You nailed it!'
              : score > total / 2
                ? `Nice! ${pct}% correct. Review the ones you missed.`
                : `Keep at it! ${pct}% — review the lesson and retry.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-6 border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        {/* Progress bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            Quick Check
          </span>
          <span className="text-xs text-muted-foreground">
            {current + 1} / {questions.length}
          </span>
        </div>

        <div
          ref={containerRef}
          className={`transition-all duration-200 ${
            animating ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
          }`}
        >
          <p className="font-medium mb-3">{q.question}</p>

          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isOptCorrect = i === q.correctIndex;
              const showResult = revealed;

              return (
                <button
                  key={`opt-${q.question.slice(0, 10)}-${i}`}
                  type="button"
                  onClick={() => !revealed && setSelected(i)}
                  disabled={revealed}
                  style={
                    showResult && isSelected && !isOptCorrect
                      ? { animation: 'shake 0.3s ease-in-out' }
                      : undefined
                  }
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-all duration-200 ${
                    showResult && isOptCorrect
                      ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 scale-[1.01]'
                      : showResult && isSelected && !isOptCorrect
                        ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                        : isSelected
                          ? 'border-primary bg-primary/10 scale-[1.01]'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.005]'
                  }`}
                >
                  <span className="mr-2 font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {showResult && isOptCorrect && (
                    <span className="ml-2 text-green-600 dark:text-green-400 font-bold">✓</span>
                  )}
                  {showResult && isSelected && !isOptCorrect && (
                    <span className="ml-2 text-red-600 dark:text-red-400 font-bold">✗</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {revealed && q.explanation && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground animate-[fadeIn_0.3s_ease-in-out]">
            <span className="font-semibold">💡 Explanation:</span> {q.explanation}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {!revealed ? (
            <Button size="sm" disabled={selected === null} onClick={handleCheck}>
              Check Answer
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext}>
              {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Parse inline quiz markers from markdown content.
 * Format: :::quiz\n{JSON array of questions}\n:::
 * Returns the cleaned markdown and extracted questions.
 */
export function parseInlineQuizzes(markdown: string): {
  cleanMarkdown: string;
  quizzes: QuizQuestion[][];
} {
  const regex = /:::quiz\n([\s\S]*?)\n:::/g;
  const quizzes: QuizQuestion[][] = [];
  let cleanMarkdown = markdown;

  let match = regex.exec(markdown);
  while (match !== null) {
    try {
      const raw = match[1] ?? '';
      const questions = JSON.parse(raw) as QuizQuestion[];
      quizzes.push(questions);
      cleanMarkdown = cleanMarkdown.replace(match[0], `<!--quiz-${quizzes.length - 1}-->`);
    } catch {
      // Invalid JSON, skip
    }
    match = regex.exec(markdown);
  }

  return { cleanMarkdown, quizzes };
}
