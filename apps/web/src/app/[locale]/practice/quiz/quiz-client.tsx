'use client';

import {
  type QuizQuestion,
  enqueueQuizRemediationAction,
  finishQuizAction,
  nextQuizQuestionAction,
  startQuizAction,
  submitQuizAnswerAction,
} from '@/app/actions/quiz';
import { ProgressBar } from '@/components/progress-bar';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

export interface QuizClientProps {
  quizId: string;
  returnTo?: string;
  returnLabel?: string;
  /** exam: full length + timer + pass/fail. practice: adaptive SE stop. */
  mode?: 'exam' | 'practice';
}

interface AnswerRecord {
  questionId: string;
  correct: boolean;
  a: number;
  b: number;
  c: number;
}

interface FailedQuestion {
  id: string;
  prompt: string;
  correct: string;
  explanation: string | null;
}

interface FinalStats {
  score: number;
  correctCount: number;
  totalCount: number;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function QuizClient({ quizId, returnTo, returnLabel, mode = 'practice' }: QuizClientProps) {
  const t = useTranslations('practice');
  const tSrs = useTranslations('srs');
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | undefined>(undefined);
  const [passingScore, setPassingScore] = useState(80);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [theta, setTheta] = useState(0);
  const [responses, setResponses] = useState<AnswerRecord[]>([]);
  const [failed, setFailed] = useState<FailedQuestion[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finalStats, setFinalStats] = useState<FinalStats | null>(null);
  const [finalTheta, setFinalTheta] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reinforcing, setReinforcing] = useState(false);
  const [reinforced, setReinforced] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const doneRef = useRef(false);

  const start = () => {
    startTransition(async () => {
      const r = await startQuizAction(quizId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAttemptId(r.attemptId);
      setPassingScore(r.passingScore);
      setTotalQuestions(r.totalQuestions);
      setStarted(true);
      setDeadline(Date.now() + r.durationMs);
      const first = await nextQuizQuestionAction(quizId, [], 0, [], { mode });
      if (first.ok && first.question) {
        setQuestion(first.question);
        setSeenIds([first.question.id]);
      } else if (first.ok) {
        await finish();
      } else {
        setError(first.error);
      }
    });
  };

  /** Finalise the attempt server-side (idempotent) and show results. */
  const finish = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFinishing(true);
    try {
      const r = await finishQuizAction(
        quizId,
        attemptId ?? '',
        responses.map((x) => ({ questionId: x.questionId, correct: x.correct })),
        Date.now() - startedAt,
      );
      if (r.ok) {
        setFinalStats({ score: r.score, correctCount: r.correctCount, totalCount: r.totalCount });
      }
    } catch {
      // Show local results even if finalising failed.
    }
    setFinishing(false);
    setDone(true);
    setQuestion(null);
  }, [quizId, attemptId, responses, startedAt]);

  // Countdown clock; expiry auto-finishes (exam discipline).
  useEffect(() => {
    if (!started || done || deadline === null) return;
    const id = window.setInterval(() => {
      const remaining = deadline - Date.now();
      setNowMs(Date.now());
      if (remaining <= 0) {
        window.clearInterval(id);
        void finish();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [started, done, deadline, finish]);

  const choose = (option: string) => {
    if (!question || revealed) return;
    setSelected(option);
    setRevealed(true);
  };

  const next = () => {
    if (!question || !selected) return;
    const current = question;
    const correct = selected === current.correct;
    if (!correct) {
      setFailed((prev) =>
        prev.some((f) => f.id === current.id)
          ? prev
          : [
              ...prev,
              {
                id: current.id,
                prompt: current.prompt,
                correct: current.correct,
                explanation: null,
              },
            ],
      );
    }
    const newResp: AnswerRecord = {
      questionId: current.id,
      correct,
      a: current.a,
      b: current.b,
      c: current.c,
    };
    const allResponses = [...responses, newResp];
    startTransition(async () => {
      const r = await submitQuizAnswerAction(
        quizId,
        current.id,
        selected,
        Date.now() - startedAt,
        responses,
        seenIds,
        attemptId,
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setTheta(r.newTheta);
      setExplanation(r.explanation);
      if (!correct && r.explanation) {
        setFailed((prev) =>
          prev.map((f) => (f.id === current.id ? { ...f, explanation: r.explanation } : f)),
        );
      }
      setResponses(allResponses);
      const next = await nextQuizQuestionAction(quizId, seenIds, r.newTheta, allResponses, {
        mode,
      });
      if (!next.ok) {
        setError(next.error);
        return;
      }
      if (next.question === null) {
        setFinalTheta(r.newTheta);
        await finish();
        return;
      }
      // The guard above narrows `next.question` to a real `QuizQuestion`,
      // but TS doesn't always carry the narrowing through the `setState`
      // side-effect, so we bind to a local first.
      const nextQ = next.question;
      setSeenIds((prev) => [...prev, nextQ.id]);
      setQuestion(nextQ);
      setSelected(null);
      setRevealed(false);
      setExplanation(null);
    });
  };

  if (!started) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <h2 className="text-2xl font-semibold">{quizId}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button onClick={start} disabled={pending}>
            {pending ? '…' : t('startQuiz')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    const pct = finalStats ? Math.round(finalStats.score * 100) : null;
    const passed = pct !== null && pct >= passingScore;
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <h2 className="text-2xl font-semibold">{t('result')}</h2>
          {finishing ? (
            <p className="text-muted-foreground">…</p>
          ) : (
            <>
              <p
                className={`text-4xl font-bold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {pct !== null ? `${pct}%` : '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                {passed ? t('examPassedLabel') : t('examFailedLabel')} ·{' '}
                {t('requiredScoreLabel', { score: passingScore })}
              </p>
              {finalStats ? (
                <p className="text-muted-foreground">
                  {finalStats.correctCount}/{finalStats.totalCount} correct · θ{' '}
                  {finalTheta.toFixed(2)}
                </p>
              ) : null}
            </>
          )}
          {failed.length > 0 ? (
            <div className="mx-auto max-w-xl space-y-2 pt-2 text-left">
              <p className="text-sm font-medium">{t('reviewMistakes')}</p>
              <ul className="space-y-2">
                {failed.map((f) => (
                  <li key={f.id} className="space-y-1 rounded-md border p-3 text-sm">
                    <p className="font-medium">{f.prompt}</p>
                    <p className="text-green-700 dark:text-green-300">✓ {f.correct}</p>
                    {f.explanation ? (
                      <p className="text-muted-foreground">{f.explanation}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {reinforced ? (
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('reinforcedGoReview')}{' '}
                  <a href="/practice/srs" className="font-medium underline underline-offset-2">
                    {t('tabSrs')}
                  </a>
                </p>
              ) : (
                <Button
                  variant="outline"
                  disabled={reinforcing}
                  onClick={() => {
                    setReinforcing(true);
                    startTransition(async () => {
                      const r = await enqueueQuizRemediationAction(failed.map((f) => f.id));
                      setReinforcing(false);
                      if (r.ok) setReinforced(true);
                      else setError(r.error);
                    });
                  }}
                >
                  {reinforcing ? '…' : t('reinforceInSrs')}
                </Button>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {returnTo ? (
              <Button asChild variant="outline">
                <a href={returnTo}>{returnLabel ?? t('backToUnit')}</a>
              </Button>
            ) : null}
            <Button onClick={() => window.location.reload()}>{t('tryAgain')}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!question) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const remaining = deadline === null ? null : deadline - nowMs;
  const total = Math.max(totalQuestions, seenIds.length + 1);
  const progress = (seenIds.length / total) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {tSrs('progress', { current: seenIds.length, total })}
        </span>
        {remaining !== null ? (
          <span
            role="timer"
            aria-label={t('timeLeft')}
            className={`rounded px-2 py-0.5 font-mono font-semibold ${
              remaining < 60_000
                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {formatClock(remaining)}
          </span>
        ) : null}
        <span className="text-muted-foreground">
          {t('yourTheta')}: {theta.toFixed(2)}
        </span>
      </div>
      <ProgressBar value={progress} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-lg font-medium">{question.prompt}</p>
          <ul className="space-y-2">
            {question.options.map((opt) => {
              const isSelected = selected === opt;
              const isCorrect = revealed && opt === question.correct;
              const isWrong = revealed && isSelected && opt !== question.correct;
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => choose(opt)}
                    disabled={revealed}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : isWrong
                          ? 'border-red-500 bg-red-50 dark:bg-red-950'
                          : isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-accent'
                    } disabled:opacity-100`}
                  >
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
          {revealed ? (
            <div className="space-y-1">
              <p
                className={`text-sm ${selected === question.correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
              >
                {selected === question.correct ? t('correct') : t('incorrect')}
              </p>
              {explanation ? <p className="text-sm text-muted-foreground">{explanation}</p> : null}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={next} disabled={!revealed || pending}>
              {pending ? '…' : t('next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
