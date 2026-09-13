import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getContentRoot } from '@academy/content';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { FalseFriendsClient } from './false-friends-client';
import { GrammarClient } from './grammar-client';
import { IdiomsUkClient } from './idioms-uk-client';
import { ListeningClient } from './listening-client';
import { WordMatchClient } from './word-match-client';

interface GamePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * Single-game page. Routes to the appropriate client based on slug.
 */
export default async function GamePage({ params }: GamePageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const base = join(getContentRoot(), 'english', 'games');
  const file = join(base, `${slug}.json`);
  if (!existsSync(file)) notFound();

  const data = JSON.parse(readFileSync(file, 'utf8'));

  if (slug === 'false-friends' && Array.isArray(data.rounds) && data.rounds.length > 0) {
    return <FalseFriendsClient rounds={data.rounds} title={data.title} />;
  }

  if (slug === 'word-match' && Array.isArray(data.rounds) && data.rounds.length > 0) {
    return <WordMatchClient rounds={data.rounds} title={data.title} />;
  }

  if (slug === 'idioms-uk' && Array.isArray(data.idioms) && data.idioms.length > 0) {
    return <IdiomsUkClient idioms={data.idioms} title={data.title} />;
  }

  if (slug === 'grammar' && Array.isArray(data.categories) && data.categories.length > 0) {
    return <GrammarClient categories={data.categories} />;
  }

  if (slug === 'listening' && Array.isArray(data.rounds) && data.rounds.length > 0) {
    return <ListeningClient rounds={data.rounds} title={data.title} />;
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
      <p>Coming soon — implementation in a later phase.</p>
    </div>
  );
}
