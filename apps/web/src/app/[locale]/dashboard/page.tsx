import { auth } from '@/auth';
import { Link } from '@/components/link';
import { DEFAULT_ACHIEVEMENTS, evaluateAchievements } from '@/lib/achievements';
import { xpToNextLevel } from '@/lib/gamification';
import { getFirstIncompleteLesson, getUnitProgress } from '@/lib/learning-path';
import { masteryBucket, topicKey } from '@/lib/mastery';
import { getMasteryMap, getProgressSnapshot } from '@/lib/path-snapshot';
import { COURSES, getPathForCourse, loadCourse } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@academy/ui';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/dashboard');
  }
  const userId = session.user.id;
  const db = getDb() as SqliteDb;

  // 1. XP + level.
  const [userXp] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, userId))
    .limit(1);
  const totalXp = userXp?.totalXp ?? 0;
  const levelInfo = xpToNextLevel(totalXp);

  // 2. Streak.
  const [streakRow] = await db
    .select()
    .from(schema.userStreaks)
    .where(eq(schema.userStreaks.userId, userId))
    .limit(1);
  const currentStreak = streakRow?.currentStreak ?? 0;
  const longestStreak = streakRow?.longestStreak ?? 0;

  // 3. SRS queue size (count of due/new cards).
  const srsRows = await db
    .select({ state: schema.srsCards.state })
    .from(schema.srsCards)
    .where(eq(schema.srsCards.userId, userId));
  const now = Date.now();
  let srsDueCount = 0;
  for (const r of srsRows) {
    try {
      const s = JSON.parse(r.state as unknown as string) as { state: string; due: string };
      if (s.state === 'new' || new Date(s.due).getTime() <= now) srsDueCount += 1;
    } catch {
      // skip
    }
  }

  // 4. Recent activity (last 5 events).
  const recentEvents = await db
    .select()
    .from(schema.activityLog)
    .where(eq(schema.activityLog.userId, userId))
    .orderBy(desc(schema.activityLog.createdAt))
    .limit(5);

  // 5. Per-course progress.
  const progressRows = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));
  const completedLessonIds = new Set(
    progressRows.filter((r) => r.status === 'completed').map((r) => r.lessonId),
  );
  const courseProgress = COURSES.map((c) => {
    const loaded = loadCourse(c.slug);
    const total = loaded ? loaded.units.reduce((acc, u) => acc + u.lessons.length, 0) : 0;
    const done = loaded
      ? loaded.units.reduce(
          (acc, u) => acc + u.lessons.filter((l) => completedLessonIds.has(l.id)).length,
          0,
        )
      : 0;
    return {
      slug: c.slug,
      title: c.title,
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  // 6b. Today's activity count (UTC day) for the daily goal.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const todayRows = await db
    .select({ id: schema.activityLog.id })
    .from(schema.activityLog)
    .where(
      and(eq(schema.activityLog.userId, userId), gte(schema.activityLog.createdAt, startOfDay)),
    );
  const todayCount = todayRows.length;
  const DAILY_GOAL = 3;
  const allAchievements = [...DEFAULT_ACHIEVEMENTS];
  // (We also load the 41 from RedLab, but DEFAULT_ACHIEVEMENTS is
  // the canonical engine list. The achievements page will load
  // the full set from DB.)
  const userContext = {
    lessonsCompleted: completedLessonIds.size,
    lessonsCompletedByTrack: {},
    labsCompleted: 0,
    projectsCompleted: 0,
    quizzesPerfect: 0,
    vocabSeen: 0,
    englishEpisodesCompleted: 0,
    srsByState: { new: 0, learning: 0, review: 0, relearning: 0 },
    currentStreak,
    totalXp,
  };
  const { unlocked } = evaluateAchievements(allAchievements, userContext);
  const recentAchievements = unlocked.slice(0, 3);

  // Skill mastery heatmap + next best action (flagship paths only).
  const snap = await getProgressSnapshot(userId);
  const masteryMap = await getMasteryMap(userId);
  const pathCourses = COURSES.map((c) => ({ def: c, path: getPathForCourse(c.slug) })).filter(
    (
      x,
    ): x is {
      def: (typeof COURSES)[number];
      path: NonNullable<ReturnType<typeof getPathForCourse>>;
    } => x.path !== null,
  );
  const nextActions = pathCourses.flatMap(({ def, path }) => {
    const loaded = loadCourse(def.slug);
    if (!loaded) return [];
    const idsByUnit = new Map(loaded.units.map((u) => [u.slug, u.lessons.map((l) => l.id)]));
    const states = getUnitProgress(path, idsByUnit, snap);
    const next = states.find((s) => s.status.status === 'available');
    if (!next) return [];
    const first = getFirstIncompleteLesson(path, idsByUnit, snap);
    const unit = loaded.units.find((u) => u.slug === next.slug);
    const lesson = unit?.lessons.find((l) => l.id === first?.lessonId);
    if (!lesson) return [];
    return [
      {
        courseSlug: def.slug,
        courseTitle: def.title,
        unitSlug: next.slug,
        unitTitle: unit?.title ?? next.slug,
        href: `/courses/${def.slug}/units/${next.slug}/lessons/${lesson.slug}`,
        lessonTitle: lesson.title,
      },
    ];
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('welcome', { name: session.user.name ?? session.user.email ?? '' })}
        </h1>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>{t('totalXp')}</CardDescription>
            <CardTitle className="text-3xl">{totalXp}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t('level', { n: levelInfo.currentLevel })} · {tCommon('xp')} {levelInfo.xpIntoLevel}/
            {levelInfo.xpNeededForNext}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('streak')}</CardDescription>
            <CardTitle className="text-3xl">{currentStreak} 🔥</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t('longestStreak', { n: longestStreak })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('srsDue')}</CardDescription>
            <CardTitle className="text-3xl">{srsDueCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/practice/srs"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('startReview')} →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('todayGoal')}</CardDescription>
            <CardTitle className="text-3xl">
              {todayCount}/{DAILY_GOAL} {todayCount >= DAILY_GOAL ? '✅' : '🎯'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <progress
              className="h-2 w-full overflow-hidden rounded-full bg-muted accent-primary"
              value={Math.min(todayCount, DAILY_GOAL)}
              max={DAILY_GOAL}
              aria-label={t('todayGoal')}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t('achievementsUnlocked')}</CardDescription>
            <CardTitle className="text-3xl">
              {unlocked.length} / {allAchievements.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/achievements"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('viewAll')} →
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">{t('courseProgress')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {courseProgress.map((cp) => (
            <Link
              key={cp.slug}
              href={`/courses/${cp.slug}`}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <p className="font-medium">{cp.title}</p>
              <p className="text-sm text-muted-foreground">
                {cp.done}/{cp.total} {tCommon('lessons')} · {cp.pct}%
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${cp.pct}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {nextActions.length > 0 ? (
        <section className="mb-8" aria-labelledby="next-step-heading">
          <h2 id="next-step-heading" className="mb-4 text-2xl font-semibold">
            {t('nextStep')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextActions.map((a) => (
              <Link
                key={`${a.courseSlug}-${a.unitSlug}`}
                href={a.href}
                className="block rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {a.courseTitle} · {a.unitTitle}
                </p>
                <p className="mt-1 font-medium">{a.lessonTitle} →</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {pathCourses.length > 0 ? (
        <section className="mb-8" aria-labelledby="mastery-heading">
          <h2 id="mastery-heading" className="mb-4 text-2xl font-semibold">
            {t('mastery')}
          </h2>
          <div className="space-y-4">
            {pathCourses.map(({ def, path }) => {
              const loaded = loadCourse(def.slug);
              const units = loaded?.units ?? [];
              return (
                <div key={def.slug} className="rounded-lg border bg-card p-4">
                  <p className="mb-3 font-medium">{def.title}</p>
                  <ul className="space-y-2">
                    {path.levels.flatMap((l) =>
                      l.units.map((pu) => {
                        const unit = units.find((u) => u.slug === pu.unit);
                        const m = masteryMap[topicKey(def.slug, pu.unit)];
                        const bucket = m && m.attempts > 0 ? masteryBucket(m.mastery) : null;
                        const pct = m && m.attempts > 0 ? Math.round(m.mastery * 100) : 0;
                        return (
                          <li key={pu.unit} className="flex items-center gap-3 text-sm">
                            <span className="w-40 shrink-0 truncate text-muted-foreground">
                              {unit?.title ?? pu.unit}
                            </span>
                            <progress
                              className={`h-2 flex-1 overflow-hidden rounded-full bg-muted ${
                                bucket === 'mastered'
                                  ? 'accent-green-500'
                                  : bucket === 'strong'
                                    ? 'accent-primary'
                                    : bucket === 'developing'
                                      ? 'accent-amber-500'
                                      : bucket === 'weak'
                                        ? 'accent-red-500'
                                        : ''
                              }`}
                              value={pct}
                              max={100}
                              aria-label={unit?.title ?? pu.unit}
                            />
                            <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                              {bucket ? `${pct}%` : '—'}
                            </span>
                          </li>
                        );
                      }),
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">{t('recentAchievements')}</h2>
        {recentAchievements.length === 0 ? (
          <EmptyState
            title={t('noAchievementsYet')}
            action={
              <Link
                href="/courses"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {tCommon('continue')} →
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {recentAchievements.map((slug) => (
              <li key={slug} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span aria-hidden="true" className="text-2xl">
                  🏆
                </span>
                <span className="font-medium">{slug}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t('recentActivity')}</h2>
        {recentEvents.length === 0 ? (
          <EmptyState
            title={t('noActivityYet')}
            action={
              <Link
                href="/courses"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {tCommon('start')} →
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {recentEvents.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <span className="font-medium">{e.event}</span>
                <span className="text-xs text-muted-foreground">
                  {e.createdAt.toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
