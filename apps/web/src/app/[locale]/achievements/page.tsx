import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { auth } from '@/auth';
import {
  type AchievementDefinition,
  DEFAULT_ACHIEVEMENTS,
  evaluateAchievements,
} from '@/lib/achievements';
import type { AchievementRule } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { Card, CardContent, CardHeader, CardTitle } from '@academy/ui';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface LoadedAchievement extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: Date | null;
}

export default async function AchievementsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('achievements');
  const tCommon = await getTranslations('common');

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/achievements');
  }
  const userId = session.user.id;
  const db = getDb() as SqliteDb;

  // 1. Load all known achievements (engine defaults + the 41 from
  // the RedLab v3 migration).
  const allDefs: AchievementDefinition[] = [...DEFAULT_ACHIEVEMENTS, ...loadRedlabAchievements()];

  // 2. Build a user context and evaluate which ones are unlocked.
  const completedLessons = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));
  const completedLessonIds = new Set(
    completedLessons.filter((r) => r.status === 'completed').map((r) => r.lessonId),
  );
  const srsRows = await db
    .select({ state: schema.srsCards.state })
    .from(schema.srsCards)
    .where(eq(schema.srsCards.userId, userId));
  const srsByState = { new: 0, learning: 0, review: 0, relearning: 0 };
  for (const r of srsRows) {
    try {
      const s = JSON.parse(r.state as unknown as string) as { state: keyof typeof srsByState };
      srsByState[s.state] += 1;
    } catch {
      // skip
    }
  }
  const [userXp] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, userId))
    .limit(1);
  const [streakRow] = await db
    .select()
    .from(schema.userStreaks)
    .where(eq(schema.userStreaks.userId, userId))
    .limit(1);
  const userContext = {
    lessonsCompleted: completedLessonIds.size,
    lessonsCompletedByTrack: {},
    labsCompleted: 0,
    projectsCompleted: 0,
    quizzesPerfect: 0,
    vocabSeen: srsRows.length,
    englishEpisodesCompleted: 0,
    srsByState,
    currentStreak: streakRow?.currentStreak ?? 0,
    totalXp: userXp?.totalXp ?? 0,
  };
  const { unlocked } = evaluateAchievements(allDefs, userContext);
  const unlockedSet = new Set(unlocked);

  // 3. Load real unlock timestamps from `user_achievements`.
  const userUnlocks = await db
    .select()
    .from(schema.userAchievements)
    .where(eq(schema.userAchievements.userId, userId));
  const unlockByAchievementId = new Map(userUnlocks.map((u) => [u.achievementId, u.unlockedAt]));

  // 4. Compose the final list with state.
  const items: LoadedAchievement[] = allDefs.map((a) => {
    const persisted = unlockByAchievementId.get(a.id);
    const isUnlocked = unlockedSet.has(a.slug) || Boolean(persisted);
    return {
      ...a,
      unlocked: isUnlocked,
      unlockedAt: persisted ?? (isUnlocked ? new Date() : null),
    };
  });

  // Sort: unlocked first (newest first), then locked.
  items.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    const aTime = a.unlockedAt?.getTime() ?? 0;
    const bTime = b.unlockedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('progress', { unlocked: unlocked.length, total: allDefs.length })}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <Card key={a.id} className={a.unlocked ? 'border-primary/50' : 'opacity-60 grayscale'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-3xl">
                  {a.icon}
                </span>
                <CardTitle className="text-lg">{a.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">{a.description}</p>
              <p className="text-xs">
                <span className="font-medium">
                  +{a.xp} {tCommon('xp')}
                </span>
                {' · '}
                <span className="text-muted-foreground">{a.rarity}</span>
              </p>
              {a.unlocked && a.unlockedAt ? (
                <p className="text-xs text-muted-foreground">
                  {t('unlockedOn', { date: a.unlockedAt.toLocaleDateString(locale) })}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function loadRedlabAchievements(): AchievementDefinition[] {
  // Read the 5 RedLab achievement JSONs (one per course group).
  // Each file is a list of objects with `id`, `name`, `description`,
  // `icon`, `category`, `rarity`, `xpBonus`, and a `rule` JSON.
  const out: AchievementDefinition[] = [];
  const fs = require('node:fs') as typeof import('node:fs');
  const candidates = [
    'packages/content/src/achievements/networking.json',
    'packages/content/src/achievements/devops.json',
    'packages/content/src/achievements/python.json',
    'packages/content/src/achievements/data.json',
    'packages/content/src/achievements/bigdata.json',
  ];
  for (const rel of candidates) {
    const abs = join(process.cwd(), rel);
    if (!existsSync(abs)) continue;
    try {
      const list = JSON.parse(fs.readFileSync(abs, 'utf8')) as Array<{
        id: string;
        slug?: string;
        name: string;
        description: string;
        icon: string;
        category?: string;
        rarity?: string;
        xpBonus?: number;
        rule: AchievementRule;
      }>;
      for (const a of list) {
        if (out.some((x) => x.id === a.id)) continue;
        out.push({
          id: a.id,
          slug: a.slug ?? a.id,
          title: a.name,
          description: a.description,
          icon: a.icon,
          category: a.category ?? 'progress',
          rarity: a.rarity ?? 'common',
          xp: a.xpBonus ?? 0,
          rule: a.rule,
        });
      }
    } catch {
      // skip
    }
  }
  return out;
}
