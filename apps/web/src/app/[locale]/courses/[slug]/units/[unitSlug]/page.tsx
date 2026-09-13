import { auth } from '@/auth';
import { Link } from '@/components/link';
import { examThreshold, getUnitProgress, isLessonUnlocked } from '@/lib/learning-path';
import { getProgressSnapshot } from '@/lib/path-snapshot';
import { getPathForCourse, loadCourse } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface UnitPageProps {
  params: Promise<{ locale: string; slug: string; unitSlug: string }>;
}

export default async function UnitPage({ params }: UnitPageProps) {
  const { locale, slug, unitSlug } = await params;
  setRequestLocale(locale);

  const course = loadCourse(slug);
  if (!course) notFound();
  const unit = course.units.find((u) => u.slug === unitSlug);
  if (!unit) notFound();

  const t = await getTranslations('courseBrowser');
  const session = await auth();
  const completedSet = await getCompletedLessonIds(session?.user?.id, slug);

  // Path gating (logged-in users only; guests browse freely).
  const enforce = Boolean(session?.user?.id);
  const path = getPathForCourse(slug);
  const lessonIdsByUnit = new Map(course.units.map((u) => [u.slug, u.lessons.map((l) => l.id)]));
  const snap = await getProgressSnapshot(session?.user?.id);
  const unitStates = path ? getUnitProgress(path, lessonIdsByUnit, snap, { enforce }) : [];
  const thisUnitState = unitStates.find((u) => u.slug === unitSlug);
  const unitLocked = thisUnitState?.status.status === 'locked';
  const pathUnit = path?.levels.flatMap((l) => l.units).find((u) => u.unit === unitSlug);
  const objectives = pathUnit?.objectives ?? [];
  const pathExams = (pathUnit?.exams ?? []).map((e) => ({
    id: e.id,
    required: examThreshold(e),
    best: Math.round((snap.examBest[e.id] ?? 0) * 100),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:underline">
          {t('allCourses')}
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link href={`/courses/${slug}`} className="hover:underline">
          {course.definition.title}
        </Link>
      </nav>
      <header className="mb-6 space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{unit.title}</h1>
        <p className="text-sm text-muted-foreground">
          {unit.lessons.length} {t('lessons')} · {unit.labs.length} {t('labs')}
          {unit.exam ? ` · ${t('examTitle')}` : ''}
        </p>
      </header>

      <section aria-labelledby="lessons-heading" className="mb-10 space-y-3">
        <h2 id="lessons-heading" className="text-xl font-semibold">
          {t('lessons').charAt(0).toUpperCase() + t('lessons').slice(1)}
        </h2>
        {objectives.length > 0 ? (
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">{t('objectives')}</p>
            <ul className="mt-2 space-y-1">
              {objectives.map((o) => (
                <li key={o} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="text-primary">
                    ▸
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {unitLocked && thisUnitState?.status.status === 'locked' ? (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30"
            role="note"
          >
            <p className="font-medium">🔒 {t('locked')}</p>
            <p className="mt-1 text-muted-foreground">
              {thisUnitState.status.blockedByUnit
                ? t('unlockPrevUnit', { title: thisUnitState.status.blockedByUnit })
                : t('passExamToUnlock', {
                    exam: thisUnitState.status.missingExams.join(', '),
                  })}
            </p>
          </div>
        ) : null}
        {unit.lessons.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {t('noLessonsYet')}
          </p>
        ) : (
          <ol className="space-y-2">
            {unit.lessons.map((l, i) => {
              const done = completedSet.has(l.id);
              const unlocked =
                !enforce ||
                (path !== null && isLessonUnlocked(path, unitSlug, l.id, lessonIdsByUnit, snap));
              if (!unlocked) {
                return (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 p-4 opacity-75"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground"
                      >
                        🔒
                      </span>
                      <div>
                        <p className="font-medium">{l.title}</p>
                        <p className="text-xs text-muted-foreground">{t('locked')}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.estimatedMinutes ? `${l.estimatedMinutes} ${t('minutes')}` : null}
                    </div>
                  </li>
                );
              }
              return (
                <li key={l.id}>
                  <Link
                    href={`/courses/${slug}/units/${unitSlug}/lessons/${l.slug}`}
                    className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          done
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{l.title}</p>
                        {l.summary ? (
                          <p className="text-sm text-muted-foreground line-clamp-1">{l.summary}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.estimatedMinutes ? `${l.estimatedMinutes} ${t('minutes')}` : null}
                      {l.xp ? ` · ${l.xp} ${t('xp')}` : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {pathExams.length > 0 ? (
        <section aria-labelledby="unit-exams-heading" className="mb-10 space-y-3">
          <h2 id="unit-exams-heading" className="text-xl font-semibold">
            {t('examTitle')}
          </h2>
          <ul className="space-y-2">
            {pathExams.map((e) => {
              const passed = e.best >= e.required;
              const examLocked = unitLocked;
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{unit.exam?.title ?? e.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {passed
                        ? `${t('examPassed')} · ${t('bestScore')}: ${e.best}%`
                        : `${t('bestScore')}: ${e.best}% · ${t('requiredScore', { score: e.required })}`}
                    </p>
                  </div>
                  {examLocked ? (
                    <span className="text-sm text-muted-foreground">🔒 {t('locked')}</span>
                  ) : (
                    <Link
                      href={`/practice/quiz?quiz=${e.id}&mode=exam&returnTo=/courses/${slug}/units/${unitSlug}&returnLabel=${encodeURIComponent(unit.title)}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      {passed ? t('tryAgain') : t('startExam')}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {unit.labs.length > 0 ? (
        <section className="mb-10 space-y-3">
          <h2 className="text-xl font-semibold">{t('labsTitle')}</h2>
          <ul className="space-y-2">
            {unit.labs.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/courses/${slug}/labs/${l.slug}`}
                  className="block rounded-lg border bg-card p-4 hover:bg-accent"
                >
                  <p className="font-medium">{l.title}</p>
                  <p className="text-sm text-muted-foreground">{l.objective}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

async function getCompletedLessonIds(
  userId: string | null | undefined,
  courseSlug: string,
): Promise<Set<string>> {
  if (!userId) return new Set();
  const db = getDb() as SqliteDb;
  const course = loadCourse(courseSlug);
  if (!course) return new Set();
  const lessonIds = new Set<string>();
  for (const u of course.units) {
    for (const l of u.lessons) lessonIds.add(l.id);
  }
  if (lessonIds.size === 0) return new Set();
  const rows = await db
    .select({ lessonId: schema.userProgress.lessonId })
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));
  const completed = new Set<string>();
  for (const r of rows) {
    if (lessonIds.has(r.lessonId)) completed.add(r.lessonId);
  }
  return completed;
}
