import { auth } from '@/auth';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { VocabularyClient } from './vocabulary-client';

interface VocabPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Vocabulary practice page. Shows the first 30 vocab words, with
 * a "add N to my deck" button that enqueues SRS cards.
 */
export default async function VocabularyPage({ params }: VocabPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const userId = session?.user?.id;

  // Pull the first 30 vocab words for the seed-list UI.
  const db = getDb() as SqliteDb;
  const words = await db.select().from(schema.vocab).limit(30);

  // Count words already in the user's deck so we can show
  // "X / 805 added".
  let inDeck = 0;
  if (userId) {
    const rows = await db
      .select({ id: schema.srsCards.id })
      .from(schema.srsCards)
      .where(and(eq(schema.srsCards.userId, userId), eq(schema.srsCards.cardType, 'vocab')));
    inDeck = rows.length;
  }

  return (
    <VocabularyClient
      totalVocab={805}
      inDeck={inDeck}
      signedIn={Boolean(userId)}
      preview={words.map((w) => ({
        id: w.id,
        term: w.term,
        translation: w.translation,
      }))}
    />
  );
}
