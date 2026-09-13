'use client';

import { ProgressBar } from '@/components/progress-bar';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export interface Idiom {
  id: string;
  phrase: string;
  literal: string;
  real: string;
  example: string;
  tags: string[];
}

export interface IdiomsUkClientProps {
  idioms: Idiom[];
  title: string;
}

type Phase = 'guess' | 'reveal' | 'done';

export function IdiomsUkClient({ idioms, title }: IdiomsUkClientProps) {
  const t = useTranslations('games');
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('guess');
  const [picked, setPicked] = useState<'literal' | 'real' | null>(null);
  const [correct, setCorrect] = useState(0);
  const current = idioms[index];

  if (!current) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold">{t('result')}</h2>
          <p className="text-muted-foreground">{t('score', { correct, total: idioms.length })}</p>
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

  const handlePick = (choice: 'literal' | 'real') => {
    setPicked(choice);
    setPhase('reveal');
    if (choice === 'real') setCorrect((n) => n + 1);
  };

  const advance = () => {
    setPicked(null);
    setPhase('guess');
    if (index + 1 >= idioms.length) {
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {idioms.length}
        </span>
        <span>{t('score', { correct, total: idioms.length })}</span>
      </div>
      <ProgressBar value={(index / idioms.length) * 100} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-center text-3xl font-bold">"{current.phrase}"</p>
          <p className="text-center text-sm text-muted-foreground">
            What does this idiom actually mean?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['literal', 'real'] as const).map((choice) => {
              const value = choice === 'literal' ? current.literal : current.real;
              const isPicked = picked === choice;
              const isRight = phase === 'reveal' && choice === 'real';
              const isWrong = phase === 'reveal' && choice === 'literal' && isPicked;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={phase !== 'guess'}
                  onClick={() => handlePick(choice)}
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
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {choice === 'literal' ? 'Literal meaning' : 'Real meaning'}
                  </p>
                  <p className="mt-1 font-medium">{value}</p>
                </button>
              );
            })}
          </div>
          {phase === 'reveal' ? (
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p>
                <span className="font-semibold">Example:</span> {current.example}
              </p>
              <p className="text-muted-foreground">Literal: {current.literal}</p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={advance} disabled={phase !== 'reveal'}>
              {index + 1 >= idioms.length ? t('finish') : t('next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
