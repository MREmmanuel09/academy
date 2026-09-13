import { CourseCard } from '@/components/course-card';
import { COURSES, loadCourse } from '@academy/content';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface CoursesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CoursesPage({ params }: CoursesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('courseBrowser');

  const courses = COURSES.map((c) => {
    const loaded = loadCourse(c.slug);
    const lessonCount = loaded ? loaded.units.reduce((acc, u) => acc + u.lessons.length, 0) : 0;
    return { course: c, lessonCount, completedCount: 0 };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </header>
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
    </div>
  );
}
