'use client';

import { loadSrsQueueAction } from '@/app/actions/srs';
import { ProgressBar } from '@/components/progress-bar';
import { type SrsCard, SrsReviewCard } from '@/components/srs-review-card';
import type { SrState } from '@/lib/srs';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export interface InitialCard {
  card: SrsCard;
  front: string;
  back: string;
  context?: string;
  state: SrState;
}

export interface SrsReviewClientProps {
  initialCards: InitialCard[];
}

/**
 * Client-side controller for the daily SRS review session.
 *
 * The first page load shows the cards the server pre-loaded; after
 * each review the next card is shown in place. When the queue
 * empties, we fetch more (or show a "done" state).
 */
export function SrsReviewClient({ initialCards }: SrsReviewClientProps) {
  const t = useTranslations('srs');
  const [queue, setQueue] = useState<InitialCard[]>(initialCards);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [refilling, startRefill] = useTransition();

  const totalStarted = initialCards.length + reviewed;
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

  if (queue.length === 0 && reviewed === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold">{t('allCaughtUp')}</h2>
          <p className="text-muted-foreground">{t('noCardsDue')}</p>
          <p className="mt-4 text-sm text-muted-foreground">{t('tryAgainTomorrow')}</p>
        </CardContent>
      </Card>
    );
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold">{t('sessionComplete')}</h2>
          <p className="text-muted-foreground">
            {t('reviewed', { count: reviewed })} · {t('accuracy', { pct: accuracy })}
          </p>
          <Button
            className="mt-4"
            disabled={refilling}
            onClick={() => {
              startRefill(async () => {
                const r = await loadSrsQueueAction(20);
                if (r.ok) {
                  // Re-load content for the new cards. For MVP we just
                  // prompt with a generic placeholder; the server
                  // re-render would be cleaner.
                  setQueue(
                    r.cards.map((c) => ({
                      card: c,
                      front: c.contentId,
                      back: '—',
                      state: c.state,
                    })),
                  );
                }
              });
            }}
          >
            {t('continueSession')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // The two guards above guarantee `queue` is non-empty here, but TS's
  // narrowing doesn't survive across hooks / closures, so we destructure
  // the head and discard the rest. The `noUncheckedIndexedAccess` flag
  // makes the destructure's type `T | undefined`, so we narrow with a
  // runtime check before using `current` below.
  const [current] = queue;
  if (current === undefined) return null;
  const handleReviewed = (newState: SrState, _xp: number) => {
    setQueue((prev) => prev.slice(1));
    setReviewed((n) => n + 1);
    if (newState.state !== 'relearning') {
      setCorrect((n) => n + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t('progress', {
            current: reviewed + 1,
            total: Math.max(totalStarted, initialCards.length),
          })}
        </span>
        <span>{t('accuracy', { pct: accuracy })}</span>
      </div>
      <ProgressBar value={(reviewed / Math.max(totalStarted, 1)) * 100} />
      <SrsReviewCard
        key={current.card.id}
        card={current.card}
        front={current.front}
        back={current.back}
        context={current.context}
        onReviewed={handleReviewed}
      />
    </div>
  );
}
