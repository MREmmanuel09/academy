import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { auth } from '@/auth';
import { Link } from '@/components/link';
import { AI_FEATURES_ENABLED } from '@/lib/ai';
import { getContentRoot } from '@academy/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@academy/ui';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface RoleplayPageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface RoleplayData {
  id: string;
  level: string;
  title: string;
  titleEs: string;
  description?: string;
  setting: string;
  aiCharacter: { name: string; role: string; personality: string };
  userRole: { name: string; context: string };
  greeting: string;
  objectives: string[];
  vocabulary: string[];
}

/**
 * Roleplay viewer. Shows the scenario, objectives, vocabulary, and
 * a placeholder chat interface. The actual AI provider integration
 * ships in a later phase — for now, we show a banner explaining
 * how to enable it (and the user can still read everything).
 */
export default async function RoleplayPage({ params }: RoleplayPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth();

  // Look up the roleplay JSON.
  const base = join(getContentRoot(), 'english', 'roleplays');
  let data: RoleplayData | null = null;
  if (existsSync(base)) {
    // The Sprint L2 source uses both `id` and `slug` conventions. Try
    // matching the file name or the inner `id` field.
    const candidates = readdirSync(base).filter((f) => f.endsWith('.json'));
    for (const c of candidates) {
      try {
        const parsed = JSON.parse(readFileSync(join(base, c), 'utf8')) as RoleplayData;
        if (parsed.id === id || c.replace(/\.json$/, '').endsWith(id)) {
          data = parsed;
          break;
        }
      } catch {
        // skip malformed
      }
    }
  }
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/practice" className="hover:underline">
            Practice
          </Link>{' '}
          / Roleplay / {data.level}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
        {data.titleEs ? <p className="text-lg text-muted-foreground">{data.titleEs}</p> : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Scenario</CardTitle>
          <CardDescription>{data.setting}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium">AI character:</span> {data.aiCharacter.name} (
            {data.aiCharacter.role})
          </p>
          <p className="text-muted-foreground">{data.aiCharacter.personality}</p>
          <p>
            <span className="font-medium">You play:</span> {data.userRole.name}
          </p>
          <p className="text-muted-foreground">{data.userRole.context}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objectives</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {data.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Useful vocabulary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.vocabulary.map((v) => (
              <span
                key={v}
                className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground"
              >
                {v}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {AI_FEATURES_ENABLED ? (
        <Card className="border-dashed bg-muted/40">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm font-medium">AI feedback is disabled.</p>
            <p className="text-sm text-muted-foreground">
              Configure an OpenAI / Anthropic / Ollama key in your settings to enable live AI
              conversation with the character.
            </p>
            {session?.user ? (
              <p>
                <Link
                  href="/settings"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open settings →
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
