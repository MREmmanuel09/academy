'use client';

import { countDueCardsAction } from '@/app/actions/srs';
import type { SrCardType } from '@/lib/srs';
import { useEffect, useRef, useState, useTransition } from 'react';

export interface DueCountBadgeProps {
  cardType?: SrCardType;
  /** Optional refresh interval (ms). Defaults to 30s. */
  refreshMs?: number;
}

/**
 * Small badge that shows "X due". Polls the server action to update.
 * Used in the practice hub and the dashboard.
 */
export function DueCountBadge({ cardType, refreshMs = 30_000 }: DueCountBadgeProps) {
  const [count, setCount] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  // Keep the latest `cardType` in a ref so the polling effect doesn't
  // restart every time the parent re-renders with a fresh `cardType`
  // identity (which would defeat the whole point of polling).
  const cardTypeRef = useRef(cardType);
  cardTypeRef.current = cardType;

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      startTransition(async () => {
        const r = await countDueCardsAction({ cardType: cardTypeRef.current });
        if (!cancelled) setCount(r.count);
      });
    };
    refresh();
    const id = setInterval(refresh, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs]);

  if (count === null) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }
  if (count === 0) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">0 due</span>
    );
  }
  return (
    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
      {count} due
    </span>
  );
}
