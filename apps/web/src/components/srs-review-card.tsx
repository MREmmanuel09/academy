'use client';

import { reviewSrsCardAction } from '@/app/actions/srs';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import type { SrCardType, SrRating, SrState } from '@/lib/srs';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export interface SrsCard {
  id: string;
  cardType: SrCardType;
  contentId: string;
}

export interface SrsReviewCardProps {
  card: SrsCard;
  /** Front of the card (the prompt). */
  front: string;
  /** Back of the card (the answer, revealed on demand). */
  back: string;
  /** Optional context shown with the answer. */
  context?: string;
  /** Called after a successful review. The parent uses this to
   *  advance the queue. */
  onReviewed: (newState: SrState, xpAwarded: number) => void;
}

const RATINGS: SrRating[] = ['again', 'hard', 'good', 'easy'];

/**
 * Single SRS review interaction. Shows the front, lets the user
 * reveal the back, then asks for a rating. The state update happens
 * server-side via `reviewSrsCardAction`.
 */
export function SrsReviewCard({ card, front, back, context, onReviewed }: SrsReviewCardProps) {
  const t = useTranslations('srs');
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { isOnline, enqueue } = useOfflineSync();

  const submit = (rating: SrRating) => {
    if (!revealed) return;
    setError(null);
    startTransition(async () => {
      if (!isOnline) {
        // Queue for later sync
        await enqueue('reviewSrsCard', { cardId: card.id, rating });
        // Optimistically advance the queue
        onReviewed(
          {
            state: 'review',
            due: new Date().toISOString(),
            stability: 0,
            difficulty: 0,
            reps: 0,
            lapses: 0,
            elapsed_days: 0,
            scheduled_days: 0,
            last_review: new Date().toISOString(),
          },
          1,
        );
        setRevealed(false);
        return;
      }

      const result = await reviewSrsCardAction(card.id, rating);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onReviewed(result.newState, result.xpAwarded);
      setRevealed(false);
    });
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-6 p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('reviewing')} · {labelFor(cardTypeLabelKey(card.cardType), t)}
        </p>
        <div className="min-h-[6rem] rounded-lg bg-muted p-6 text-center text-2xl font-medium">
          {front}
        </div>

        {revealed ? (
          <>
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-6 text-center text-2xl font-medium">
              {back}
            </div>
            {context ? <p className="text-sm text-muted-foreground">{context}</p> : null}
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {revealed ? (
            RATINGS.map((r) => (
              <Button
                key={r}
                variant={r === 'again' ? 'destructive' : 'outline'}
                disabled={pending}
                onClick={() => submit(r)}
              >
                {t(r)}
              </Button>
            ))
          ) : (
            <Button onClick={() => setRevealed(true)} disabled={pending}>
              {t('showAnswer')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function cardTypeLabelKey(t: SrCardType): string {
  switch (t) {
    case 'lesson':
      return 'cardTypeLesson';
    case 'vocab':
      return 'cardTypeVocab';
    case 'roleplay':
      return 'cardTypeRoleplay';
    case 'episode':
      return 'cardTypeEpisode';
    case 'quiz':
      return 'cardTypeQuiz';
  }
}

function labelFor(key: string, t: (k: string) => string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
