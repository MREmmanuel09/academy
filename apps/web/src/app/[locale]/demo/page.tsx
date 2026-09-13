import { CourseCard } from '@/components/course-card';
import { Link } from '@/components/link';
import { COURSES, loadCourse } from '@academy/content';
import { Button } from '@academy/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface DemoPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Public showcase: what Academy offers, with real course data and deep
 * links. Courses and sample lessons are browsable without an account;
 * practice and progress require signing up (the CTAs make that clear).
 */
export default async function DemoPage({ params }: DemoPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tHome = await getTranslations('home');
  const tCourses = await getTranslations('courseBrowser');
  const tPractice = await getTranslations('practice');
  const tNav = await getTranslations('nav');

  const courses = COURSES.map((c) => {
    const loaded = loadCourse(c.slug);
    const lessonCount = loaded ? loaded.units.reduce((acc, u) => acc + u.lessons.length, 0) : 0;
    const labCount = loaded ? loaded.units.reduce((acc, u) => acc + u.labs.length, 0) : 0;
    const firstLesson = loaded?.units.flatMap((u) =>
      u.lessons.map((l) => `/courses/${c.slug}/units/${u.slug}/lessons/${l.slug}`),
    )[0];
    return { course: c, lessonCount, labCount, firstLesson };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tHome('title')}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{tHome('subtitle')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/register">{tNav('register')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/courses">{tCourses('title')}</Link>
          </Button>
        </div>
      </header>

      {/* Real tracks with deep links into sample lessons */}
      <section aria-labelledby="demo-tracks">
        <h2 id="demo-tracks" className="text-xl font-semibold tracking-tight">
          {tCourses('title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{tCourses('subtitle')}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ course, lessonCount, labCount, firstLesson }) => (
            <div key={course.slug} className="flex flex-col gap-3">
              <CourseCard
                slug={course.slug}
                title={course.title}
                description={course.description}
                track={course.track}
                difficulty={course.difficulty}
                estimatedHours={course.estimatedHours}
                lessonCount={lessonCount}
                completedCount={0}
              />
              <p className="px-1 text-xs text-muted-foreground">
                {lessonCount} {tCourses('lessons')} · {labCount} {tCourses('labs')}
                {firstLesson ? (
                  <>
                    {' · '}
                    <Link href={firstLesson} className="text-primary underline underline-offset-2">
                      {tHome('cta')} →
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Practice teaser (gated: redirects to login when logged out) */}
      <section aria-labelledby="demo-practice" className="rounded-lg border bg-card p-6 sm:p-8">
        <h2 id="demo-practice" className="text-xl font-semibold tracking-tight">
          {tPractice('indexHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{tPractice('indexLead')}</p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/practice">{tNav('practice')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
