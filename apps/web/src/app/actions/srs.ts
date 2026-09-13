'use server';

import { auth } from '@/auth';
import { applyXpBatch } from '@/lib/gamification';
import {
  type SrCardType,
  type SrRating,
  type SrState,
  createInitialCard,
  deserializeState,
  reviewCard,
  serializeState,
} from '@/lib/srs';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type SrsQueueResult =
  | {
      ok: true;
      cards: { id: string; cardType: SrCardType; contentId: string; state: SrState }[];
    }
  | { ok: false; error: string };

/**
 * Load up to `limit` due cards for the current user. A card is
 * "due" when its `due` timestamp is <= now. New cards (state
 * 'new') are always considered due.
 *
 * The cards come from the user's existing `srs_cards` table.
 * If the user has no cards, returns an empty queue.
 */
export async function loadSrsQueueAction(
  limit = 20,
  filter?: { cardType?: SrCardType },
): Promise<SrsQueueResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }
  const db = getDb() as SqliteDb;
  const now = new Date();

  // Pull all candidate cards (we filter in JS to keep the query simple
  // and portable across SQLite/PostgreSQL).
  const conditions = [eq(schema.srsCards.userId, session.user.id)];
  if (filter?.cardType) {
    conditions.push(eq(schema.srsCards.cardType, filter.cardType));
  }
  const rows = await db
    .select()
    .from(schema.srsCards)
    .where(and(...conditions))
    .limit(limit * 3);

  const due: { id: string; cardType: SrCardType; contentId: string; state: SrState }[] = [];
  for (const row of rows) {
    const state = deserializeState(row.state as unknown as string);
    if (!state) continue;
    if (state.state === 'new' || new Date(state.due).getTime() <= now.getTime()) {
      due.push({
        id: row.id,
        cardType: row.cardType as SrCardType,
        contentId: row.contentId,
        state,
      });
      if (due.length >= limit) break;
    }
  }
  return { ok: true, cards: due };
}

export type SrsReviewResult =
  | {
      ok: true;
      newState: SrState;
      nextDue: string; // ISO date
      xpAwarded: number;
    }
  | { ok: false; error: string };

/**
 * Apply a review to a card. Updates the FSRS-6 state, persists it,
 * and awards XP. The same card cannot be reviewed twice in
 * quick succession (idempotency is handled by FSRS, not by us).
 */
export async function reviewSrsCardAction(
  cardId: string,
  rating: SrRating,
): Promise<SrsReviewResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }
  const db = getDb() as SqliteDb;
  const [row] = await db
    .select()
    .from(schema.srsCards)
    .where(eq(schema.srsCards.id, cardId))
    .limit(1);
  if (!row) {
    return { ok: false, error: 'Card not found' };
  }
  if (row.userId !== session.user.id) {
    return { ok: false, error: 'Forbidden' };
  }
  const prevState = deserializeState(row.state as unknown as string);
  if (!prevState) {
    return { ok: false, error: 'Card state corrupt' };
  }
  const nextState = reviewCard(prevState, rating, new Date());
  await db
    .update(schema.srsCards)
    .set({
      // Drizzle's $type<SrState>() widens the inferred type to the
      // object, but the column is `text` — we pass the serialized
      // string explicitly. The double cast (`as string as unknown
      // as …`) is intentional: the first one asserts the actual
      // value type, the second bridges to Drizzle's widened type.
      state: serializeState(
        nextState,
      ) as string as unknown as typeof schema.srsCards.$inferInsert.state,
      updatedAt: new Date(),
    })
    .where(eq(schema.srsCards.id, cardId));

  // Award 1 XP per review (XP_REWARDS.srsReview). Bulk-friendly.
  const { gainedXp } = applyXpBatch(0, [{ event: { kind: 'srsReview' }, minutesAgo: 0 }]);
  const [userXp] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, session.user.id))
    .limit(1);
  if (userXp) {
    await db
      .update(schema.userXp)
      .set({
        totalXp: userXp.totalXp + gainedXp,
        lastEventAt: new Date(),
      })
      .where(eq(schema.userXp.userId, session.user.id));
  } else {
    await db.insert(schema.userXp).values({
      userId: session.user.id,
      totalXp: gainedXp,
      lastEventAt: new Date(),
    });
  }

  revalidatePath('/practice/srs');
  revalidatePath('/practice/vocabulary');
  revalidatePath('/dashboard');

  return {
    ok: true,
    newState: nextState,
    nextDue: nextState.due,
    xpAwarded: gainedXp,
  };
}

export type SrsEnqueueResult =
  | { ok: true; cardId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Add a new card to the user's deck. Idempotent: if a card with
 * the same (userId, cardType, contentId) already exists, we return
 * the existing card instead of creating a duplicate.
 */
export async function enqueueSrsCardAction(
  cardType: SrCardType,
  contentId: string,
): Promise<SrsEnqueueResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }
  const db = getDb() as SqliteDb;
  const [existing] = await db
    .select()
    .from(schema.srsCards)
    .where(
      and(
        eq(schema.srsCards.userId, session.user.id),
        eq(schema.srsCards.cardType, cardType),
        eq(schema.srsCards.contentId, contentId),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: true, cardId: existing.id, created: false };
  }
  const state = createInitialCard();
  const [inserted] = await db
    .insert(schema.srsCards)
    .values({
      userId: session.user.id,
      cardType,
      contentId,
      state: serializeState(
        state,
      ) as string as unknown as typeof schema.srsCards.$inferInsert.state,
    })
    .returning({ id: schema.srsCards.id });
  return {
    ok: true,
    cardId: inserted?.id ?? '',
    created: true,
  };
}

/**
 * Count the user's due cards (across all card types). Used to
 * render the "X cards due today" badge in the sidebar.
 */
export async function countDueCardsAction(filter?: {
  cardType?: SrCardType;
}): Promise<{ count: number }> {
  const session = await auth();
  if (!session?.user?.id) return { count: 0 };
  const db = getDb() as SqliteDb;
  const conditions = [eq(schema.srsCards.userId, session.user.id)];
  if (filter?.cardType) {
    conditions.push(eq(schema.srsCards.cardType, filter.cardType));
  }
  const rows = await db
    .select({ state: schema.srsCards.state })
    .from(schema.srsCards)
    .where(and(...conditions));
  const now = Date.now();
  let count = 0;
  for (const r of rows) {
    const s = deserializeState(r.state as unknown as string);
    if (!s) continue;
    if (s.state === 'new' || new Date(s.due).getTime() <= now) count += 1;
  }
  return { count };
}

export type VocabEnqueueResult = { ok: true; enqueued: number } | { ok: false; error: string };

/**
 * Enqueue episode vocabulary as SRS cards. Vocab rows are ensured
 * first (matched by term + translation + arc, created when missing),
 * then one idempotent `vocab` card per row. Used by the episode
 * "add to SRS" button.
 */
export async function enqueueEpisodeVocabAction(
  terms: ReadonlyArray<{ term: string; translation: string }>,
  arcSlug: string,
  episodeSlug: string,
): Promise<VocabEnqueueResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }
  const db = getDb() as SqliteDb;
  let enqueued = 0;
  for (const { term, translation } of terms.slice(0, 60)) {
    if (!term || !translation) continue;
    const [vocabRow] = await db
      .select({ id: schema.vocab.id })
      .from(schema.vocab)
      .where(
        and(
          eq(schema.vocab.termEn, term),
          eq(schema.vocab.translationEs, translation),
          eq(schema.vocab.arcSlug, arcSlug),
        ),
      )
      .limit(1);
    let vocabId = vocabRow?.id;
    if (!vocabId) {
      const [inserted] = await db
        .insert(schema.vocab)
        .values({
          term,
          termEn: term,
          translation,
          translationEs: translation,
          partOfSpeech: term.includes(' ') ? 'phrase' : 'other',
          arcSlug,
          episodeSlug,
        })
        .returning({ id: schema.vocab.id });
      vocabId = inserted?.id;
    }
    if (!vocabId) continue;
    const [existing] = await db
      .select({ id: schema.srsCards.id })
      .from(schema.srsCards)
      .where(
        and(
          eq(schema.srsCards.userId, session.user.id),
          eq(schema.srsCards.cardType, 'vocab'),
          eq(schema.srsCards.contentId, vocabId),
        ),
      )
      .limit(1);
    if (existing) continue;
    await db.insert(schema.srsCards).values({
      userId: session.user.id,
      cardType: 'vocab',
      contentId: vocabId,
      state: serializeState(
        createInitialCard(),
      ) as string as unknown as typeof schema.srsCards.$inferInsert.state,
    });
    enqueued += 1;
  }
  revalidatePath('/practice/srs');
  revalidatePath('/practice/vocabulary');
  return { ok: true, enqueued };
}
