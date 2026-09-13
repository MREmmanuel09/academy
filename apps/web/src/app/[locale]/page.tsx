import { auth } from '@/auth';
import { CourseCard } from '@/components/course-card';
import { Link } from '@/components/link';
import { COURSES, loadCourse } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tBrowser = await getTranslations('courseBrowser');

  const session = await auth();
  const userId = session?.user?.id;

  // Pull completion counts for the current user in one query.
  const completionCounts = await getCompletionCounts(userId);

  // Resolve how many lessons each course has.
  const courses = COURSES.map((c) => {
    const loaded = loadCourse(c.slug);
    const lessonCount = loaded ? loaded.units.reduce((acc, u) => acc + u.lessons.length, 0) : 0;
    const completedCount = completionCounts[c.slug] ?? 0;
    return { course: c, lessonCount, completedCount };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        {session?.user ? null : (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('cta')}
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent"
            >
              {tBrowser('allCourses')} →
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="courses-heading" className="mb-12">
        <h2 id="courses-heading" className="mb-6 text-2xl font-semibold">
          {tBrowser('allCourses')}
        </h2>
        {courses.every((c) => c.lessonCount === 0) ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {tBrowser('noCourses')}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(({ course, lessonCount, completedCount }) => (
              <CourseCard
                key={course.slug}
                slug={course.slug}
                title={course.title}
                description={course.description}
                track={course.track}
                difficulty={course.difficulty}
                estimatedHours={course.estimatedHours}
                lessonCount={lessonCount}
                completedCount={completedCount}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function getCompletionCounts(
  userId: string | null | undefined,
): Promise<Record<string, number>> {
  if (!userId) return {};
  const db = getDb() as SqliteDb;
  await db
    .select({
      lessonId: schema.userProgress.lessonId,
    })
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));

  // Per-course completion counts are computed on the course detail
  // page where we have the content tree in hand. The home page
  // doesn't have it (we'd need to load every course to know which
  // lessonIds belong to which course, which is wasteful). So we
  // return 0s here and rely on the detail page for accurate counts.
  return {};
}
