'use client';

import { AudioPlayer } from '@/components/audio-player';
import { ProgressBar } from '@/components/progress-bar';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

export interface ListeningRound {
  id: string;
  level: string;
  sentence: string;
  translation: string;
  options: string[];
  /** Pre-generated audio URL when available; falls back to live TTS. */
  audioUrl?: string | null;
}

export interface ListeningClientProps {
  rounds: ListeningRound[];
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

export function ListeningClient({ rounds, title }: ListeningClientProps) {
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
    if (choice === current.translation) setCorrect((n) => n + 1);
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
          {current.level} — {index + 1} / {rounds.length}
        </span>
        <span>{t('score', { correct, total: rounds.length })}</span>
      </div>
      <ProgressBar value={(index / rounds.length) * 100} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          {/* Audio-first: the sentence stays hidden until you answer,
              like a real listening exam. Pre-generated audio wins over
              live TTS when the round provides an audioUrl. */}
          <div className="flex flex-col items-center gap-3 py-2">
            {current.audioUrl ? (
              <audio controls src={current.audioUrl} className="w-full max-w-sm">
                <track kind="captions" />
              </audio>
            ) : (
              <AudioPlayer text={current.sentence} lang="en-US" size="md" />
            )}
            {phase === 'guess' ? (
              <p className="text-center text-sm font-medium text-muted-foreground">
                🔊 Listen, then choose the correct Spanish translation
              </p>
            ) : (
              <p className="text-center text-2xl font-bold">&ldquo;{current.sentence}&rdquo;</p>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            What is the correct Spanish translation?
          </p>
          <div className="grid gap-3">
            {options.map((option) => {
              const isPicked = picked === option;
              const isRight = phase === 'reveal' && option === current.translation;
              const isWrong = phase === 'reveal' && isPicked && option !== current.translation;
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
                <span className="font-semibold">Correct:</span> {current.translation}
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
