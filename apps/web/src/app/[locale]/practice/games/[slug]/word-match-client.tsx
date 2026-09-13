'use client';

import { ProgressBar } from '@/components/progress-bar';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

export interface WordMatchRound {
  id: string;
  en: string;
  es: string;
  options: string[];
}

export interface WordMatchClientProps {
  rounds: WordMatchRound[];
  title: string;
}

type Phase = 'guess' | 'reveal' | 'done';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = temp;
  }
  return a;
}

export function WordMatchClient({ rounds, title }: WordMatchClientProps) {
  const t = useTranslations('games');
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('guess');
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const shuffledRounds = useMemo(() => shuffle(rounds), [rounds]);
  const current = shuffledRounds[index];

  if (!current) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold">{t('result')}</h2>
          <p className="text-muted-foreground">{t('score', { correct, total: rounds.length })}</p>
          <Button
            className="mt-4"
            onClick={() => {
              setIndex(0);
              setPhase('guess');
              setPicked(null);
              setCorrect(0);
            }}
          >
            {t('playAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handlePick = (choice: string) => {
    setPicked(choice);
    setPhase('reveal');
    if (choice === current.es) setCorrect((n) => n + 1);
  };

  const advance = () => {
    setPicked(null);
    setPhase('guess');
    if (index + 1 >= rounds.length) {
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
    }
  };

  const options = useMemo(() => shuffle(current.options), [current]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {rounds.length}
        </span>
        <span>{t('score', { correct, total: rounds.length })}</span>
      </div>
      <ProgressBar value={(index / rounds.length) * 100} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-center text-3xl font-bold">{current.en}</p>
          <p className="text-center text-sm text-muted-foreground">
            What does this word mean in Spanish?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const isPicked = picked === option;
              const isRight = phase === 'reveal' && option === current.es;
              const isWrong = phase === 'reveal' && isPicked && option !== current.es;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={phase !== 'guess'}
                  onClick={() => handlePick(option)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    isRight
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : isWrong
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : isPicked
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                  }`}
                >
                  <p className="font-medium">{option}</p>
                </button>
              );
            })}
          </div>
          {phase === 'reveal' ? (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p>
                <span className="font-semibold">Correct:</span> {current.es}
              </p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={advance} disabled={phase !== 'reveal'}>
              {index + 1 >= rounds.length ? t('finish') : t('next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
