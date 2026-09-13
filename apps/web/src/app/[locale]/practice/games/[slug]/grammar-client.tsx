'use client';

import { ProgressBar } from '@/components/progress-bar';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

export interface GrammarRound {
  id: string;
  type: string;
  sentence: string;
  correct: string;
  options: string[];
  explanation: string;
}

export interface GrammarCategory {
  id: string;
  title: string;
  titleEs: string;
  level: string;
  description: string;
  rounds: GrammarRound[];
}

export interface GrammarClientProps {
  categories: GrammarCategory[];
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

export function GrammarClient({ categories }: GrammarClientProps) {
  const t = useTranslations('games');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('guess');
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const category = categories[categoryIndex];
  const rounds = useMemo(() => (category ? shuffle(category.rounds) : []), [category]);
  const current = rounds[index];

  if (!category || !current) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold">{t('result')}</h2>
          <p className="text-muted-foreground">{t('score', { correct, total: rounds.length })}</p>
          <Button
            className="mt-4"
            onClick={() => {
              setCategoryIndex(0);
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
    if (choice === current.correct) setCorrect((n) => n + 1);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {category.title} ({category.level})
        </span>
        <span>
          {index + 1} / {rounds.length}
        </span>
      </div>
      <ProgressBar value={(index / rounds.length) * 100} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {category.titleEs}
          </p>
          <p className="text-center text-xl font-bold">{current.sentence}</p>
          <p className="text-center text-sm text-muted-foreground">Choose the correct option:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => {
              const isPicked = picked === option;
              const isRight = phase === 'reveal' && option === current.correct;
              const isWrong = phase === 'reveal' && isPicked && option !== current.correct;
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
              <p className="font-semibold">Explanation:</p>
              <p className="text-muted-foreground">{current.explanation}</p>
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
