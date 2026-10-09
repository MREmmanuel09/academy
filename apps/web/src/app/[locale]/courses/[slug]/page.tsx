import { auth } from '@/auth';
import { Link } from '@/components/link';
import { ProgressBar } from '@/components/progress-bar';
import { BASE_PATH } from '@/lib/base-path';
import { getUnitProgress } from '@/lib/learning-path';
import { getProgressSnapshot } from '@/lib/path-snapshot';
import { getPathForCourse, loadCourse } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface CoursePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const course = loadCourse(slug);
  if (!course) notFound();

  const t = await getTranslations('courseBrowser');
  const session = await auth();
  const userId = session?.user?.id;

  // Build a set of completed lesson IDs for this user.
  const completedSet = await getCompletedLessonIds(userId, slug);
  const totalLessons = course.units.reduce((acc, u) => acc + u.lessons.length, 0);
  const totalLabs = course.units.reduce((acc, u) => acc + u.labs.length, 0);
  const completedCount = course.units.reduce(
    (acc, u) => acc + u.lessons.filter((l) => completedSet.has(l.id)).length,
    0,
  );
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Path gating: lock badges per unit (logged-in users only).
  const enforce = Boolean(session?.user);
  const path = getPathForCourse(slug);
  const snap = await getProgressSnapshot(session?.user?.id);
  const lessonIdsByUnit = new Map(course.units.map((u) => [u.slug, u.lessons.map((l) => l.id)]));
  const unitStates = new Map(
    (path ? getUnitProgress(path, lessonIdsByUnit, snap, { enforce }) : []).map((u) => [
      u.slug,
      u.status.status,
    ]),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:underline">
          {t('allCourses')}
        </Link>
      </nav>
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.definition.title}</h1>
        <p className="text-lg text-muted-foreground">{course.definition.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded bg-secondary px-2 py-0.5 uppercase tracking-wide">
            {t(course.definition.track)}
          </span>
          <span className="rounded bg-muted px-2 py-0.5">{t(course.definition.difficulty)}</span>
          <span>
            {course.definition.estimatedHours}h · {totalLessons} {t('lessons')} · {totalLabs}{' '}
            {t('labs')}
          </span>
        </div>
        {session?.user && totalLessons > 0 ? (
          <div className="space-y-1">
            <ProgressBar value={progressPct} showLabel ariaLabel={t('yourProgress')} />
            <p className="text-xs text-muted-foreground">
              {t('yourProgress')}: {completedCount}/{totalLessons} {t('completed')}
            </p>
          </div>
        ) : null}
        {path ? (
          <div className="pt-1">
            <a
              href={`${BASE_PATH}/api/paths/${path.id}/guide`}
              download
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-muted px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              ⬇ {t('studyGuide')}
            </a>
          </div>
        ) : null}
      </header>

      <section aria-labelledby="syllabus-heading" className="space-y-3">
        <h2 id="syllabus-heading" className="text-2xl font-semibold">
          {t('syllabus')}
        </h2>
        <ol className="space-y-2">
          {course.units.map((u, i) => {
            const unitDone = u.lessons.filter((l) => completedSet.has(l.id)).length;
            const locked = unitStates.get(u.slug) === 'locked';
            return (
              <li key={u.slug} className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {locked ? (
                      <span aria-hidden="true" className="mr-1">
                        🔒
                      </span>
                    ) : null}
                    {i + 1}. {u.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {locked ? (
                      t('locked')
                    ) : (
                      <>
                        {unitDone}/{u.lessons.length} · {u.labs.length} {t('labs')}
                      </>
                    )}
                  </span>
                </div>
                <Link
                  href={`/courses/${slug}/units/${u.slug}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {u.lessons.length > 0 ? t('continueCourse') : t('viewCourse')} →
                </Link>
              </li>
            );
          })}
        </ol>
        {course.units.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {t('noLessonsYet')}
          </p>
        ) : null}
      </section>

      {course.projects.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-semibold">{t('projectsTitle')}</h2>
          <ul className="space-y-2">
            {course.projects.map((p) => (
              <li key={p.id} className="rounded-lg border bg-card p-4">
                <Link
                  href={`/courses/${slug}/projects/${p.slug}`}
                  className="text-lg font-medium hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-sm text-muted-foreground">{p.goal}</p>
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
  // Collect every lesson id that belongs to this course.
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
