import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Link } from '@/components/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@academy/ui';
import { setRequestLocale } from 'next-intl/server';

interface GamesPageProps {
  params: Promise<{ locale: string }>;
}

interface GameMeta {
  id: string;
  slug: string;
  title: string;
  titleEs: string;
  description: string;
  type: string;
  hasData: boolean;
}

/**
 * Game selection hub. The 4 games with real data have full
 * implementations; the 5th (word-match) is a stub. We surface
 * a "play" link for the first one only.
 */
export default async function GamesPage({ params }: GamesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const games = await loadGames();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <Card key={g.id} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{g.title}</CardTitle>
              <CardDescription>{g.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              {g.hasData ? (
                <Link
                  href={`/practice/games/${g.slug}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Jugar →
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">Coming soon</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function loadGames(): Promise<GameMeta[]> {
  const fs = await import('node:fs/promises');
  const { getContentRoot } = await import('@academy/content');
  const base = join(getContentRoot(), 'english', 'games');
  const slugs = ['false-friends', 'grammar', 'listening', 'idioms-uk', 'word-match'];
  const out: GameMeta[] = [];
  for (const slug of slugs) {
    const file = join(base, `${slug}.json`);
    let hasData = false;
    let title = slug;
    let titleEs = slug;
    let description = '';
    let type = '';
    let id = slug;
    if (existsSync(file)) {
      try {
        const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        id = String(data.id ?? slug);
        title = String(data.title ?? slug);
        titleEs = String(data.titleEs ?? title);
        description = String(data.description ?? '');
        type = String(data.type ?? '');
        hasData =
          ('rounds' in data && Array.isArray(data.rounds) && data.rounds.length > 0) ||
          ('categories' in data && Array.isArray(data.categories));
      } catch {
        hasData = false;
      }
    }
    out.push({ id, slug, title, titleEs, description, type, hasData });
  }
  void fs;
  return out;
}
