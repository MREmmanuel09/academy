import { auth } from '@/auth';
import { getQuestionDetail } from '@/lib/quiz-content';
import { deserializeState } from '@/lib/srs';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { SrsReviewClient } from './srs-review-client';

interface SrsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Daily SRS review page.
 *
 * Loads up to 20 due cards for the current user, fetches the
 * associated content (vocab / lesson / etc.) for the prompts, and
 * hands everything to the client component for the review loop.
 */
export default async function SrsPage({ params }: SrsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/practice/srs');
  }

  const db = getDb() as SqliteDb;
  const now = new Date();
  const rows = await db
    .select()
    .from(schema.srsCards)
    .where(eq(schema.srsCards.userId, session.user.id))
    .limit(60);

  // `deserializeState` returns `SrState | null`. We filter out the `null`s
  // with a type predicate so the `due` array is statically known to be
  // non-null — that lets us drop the `!` non-null assertion below.
  const due = rows
    .map((r) => {
      const state = deserializeState(r.state as unknown as string);
      return state ? { row: r, state } : null;
    })
    .filter(
      (
        x,
      ): x is {
        row: (typeof rows)[number];
        state: NonNullable<ReturnType<typeof deserializeState>>;
      } => x !== null,
    )
    .filter((x) => x.state.state === 'new' || new Date(x.state.due).getTime() <= now.getTime())
    .slice(0, 20);

  const cards = await Promise.all(
    due.map(async ({ row, state }) => {
      const front = await loadCardFront(db, row.cardType, row.contentId);
      const back = await loadCardBack(db, row.cardType, row.contentId);
      const context = await loadCardContext(db, row.cardType, row.contentId);
      return {
        card: {
          id: row.id,
          cardType: row.cardType as 'lesson' | 'vocab' | 'roleplay' | 'episode' | 'quiz',
          contentId: row.contentId,
        },
        front,
        back,
        context: context ?? undefined,
        state: state as unknown as string,
      };
    }),
  );

  return (
    <SrsReviewClient
      initialCards={cards.map((c) => ({
        ...c,
        state: c.state as unknown as import('@/lib/srs').SrState,
      }))}
    />
  );
}

async function loadCardFront(db: SqliteDb, cardType: string, contentId: string): Promise<string> {
  if (cardType === 'vocab') {
    const [row] = await db
      .select()
      .from(schema.vocab)
      .where(eq(schema.vocab.id, contentId))
      .limit(1);
    if (row) return row.termEn ?? row.term;
  }
  if (cardType === 'lesson') {
    return `Lesson: ${contentId}`;
  }
  if (cardType === 'quiz') {
    const q = await getQuestionDetail(contentId);
    if (q) return q.options.length > 0 ? `${q.prompt}\n${q.options.join(' / ')}` : q.prompt;
  }
  return contentId;
}

async function loadCardBack(db: SqliteDb, cardType: string, contentId: string): Promise<string> {
  if (cardType === 'vocab') {
    const [row] = await db
      .select()
      .from(schema.vocab)
      .where(eq(schema.vocab.id, contentId))
      .limit(1);
    if (row) return row.translationEs ?? row.translation;
  }
  if (cardType === 'quiz') {
    const q = await getQuestionDetail(contentId);
    if (q) return q.explanation ? `${q.correct} — ${q.explanation}` : q.correct;
  }
  return '—';
}

async function loadCardContext(
  db: SqliteDb,
  cardType: string,
  contentId: string,
): Promise<string | null> {
  if (cardType === 'vocab') {
    const [row] = await db
      .select()
      .from(schema.vocab)
      .where(eq(schema.vocab.id, contentId))
      .limit(1);
    if (row) {
      const bits: string[] = [];
      if (row.exampleEn) bits.push(row.exampleEn);
      if (row.exampleEs) bits.push(`— ${row.exampleEs}`);
      return bits.join(' ') || null;
    }
  }
  return null;
}
