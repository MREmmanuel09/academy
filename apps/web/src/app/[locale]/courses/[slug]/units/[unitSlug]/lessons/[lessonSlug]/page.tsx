import { auth } from '@/auth';
import { EpisodeViewer } from '@/components/episode-viewer';
import { LessonViewer } from '@/components/lesson-viewer';
import { Link } from '@/components/link';
import { ReadingProgress } from '@/components/reading-progress';
import { isLessonUnlocked } from '@/lib/learning-path';
import { getProgressSnapshot } from '@/lib/path-snapshot';
import { getPathForCourse, loadCourse } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface LessonPageProps {
  params: Promise<{ locale: string; slug: string; unitSlug: string; lessonSlug: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { locale, slug, unitSlug, lessonSlug } = await params;
  setRequestLocale(locale);

  const course = loadCourse(slug);
  if (!course) notFound();
  const unit = course.units.find((u) => u.slug === unitSlug);
  if (!unit) notFound();
  const lessonIndex = unit.lessons.findIndex((l) => l.slug === lessonSlug);
  if (lessonIndex < 0) notFound();
  const lesson = unit.lessons[lessonIndex];
  if (!lesson) notFound();

  const session = await auth();
  const alreadyCompleted = await isLessonCompleted(session?.user?.id, lesson.id);
  const t = await getTranslations('courseBrowser');

  // Path gating: logged-in users unlock lessons strictly in sequence.
  // Guests browse freely. Locked lessons show *why* + where to go next
  // instead of a bare redirect.
  const path = getPathForCourse(slug);
  let locked = false;
  let continueHref: string | null = null;
  let continueTitle: string | null = null;
  if (session?.user?.id && path) {
    const lessonIdsByUnit = new Map(course.units.map((u) => [u.slug, u.lessons.map((l) => l.id)]));
    const snap = await getProgressSnapshot(session.user.id);
    locked = !isLessonUnlocked(path, unitSlug, lesson.id, lessonIdsByUnit, snap);
    if (locked) {
      const ids = lessonIdsByUnit.get(unitSlug) ?? [];
      const blocker = unit.lessons
        .filter((l) => ids.slice(0, ids.indexOf(lesson.id)).includes(l.id))
        .find((l) => !snap.completedLessonIds.has(l.id));
      if (blocker) {
        continueHref = `/courses/${slug}/units/${unitSlug}/lessons/${blocker.slug}`;
        continueTitle = blocker.title;
      } else {
        continueHref = `/courses/${slug}/units/${unitSlug}`;
        continueTitle = unit.title;
      }
    }
  }

  // Find the adjacent lessons for prev/next navigation.
  const prev = unit.lessons[lessonIndex - 1];
  const next = unit.lessons[lessonIndex + 1];
  const prevHref = prev ? `/courses/${slug}/units/${unitSlug}/lessons/${prev.slug}` : null;
  const nextHref = next ? `/courses/${slug}/units/${unitSlug}/lessons/${next.slug}` : null;

  // Try to load the keyTakeaways from the sibling .meta.json if present.
  const fs = await import('node:fs/promises');
  const metaPath = lesson.sourcePath.replace(/\.md$/, '.meta.json');
  let keyTakeaways: string[] | undefined;
  try {
    const raw = await fs.readFile(metaPath, 'utf8');
    const json = JSON.parse(raw) as { keyTakeaways?: string[] };
    keyTakeaways = json.keyTakeaways;
  } catch {
    // .meta.json is optional (Sprint L2 episodes don't have it).
  }

  // Detect English episodes (they have level/arc in frontmatter)
  const isEnglishEpisode = slug === 'english' && lesson.level;

  if (isEnglishEpisode) {
    // Find arc metadata
    const arcMeta = course.units.find((u) => u.slug === unitSlug);
    const arcTitle = arcMeta?.title ?? unitSlug;
    const arcColor = '#1e40af';

    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <EpisodeViewer
          markdown={lesson.body}
          title={lesson.title}
          arcTitle={arcTitle}
          arcColor={arcColor}
          level={lesson.level}
          estimatedMinutes={lesson.estimatedMinutes}
          episodeIndex={lessonIndex}
          totalEpisodes={unit.lessons.length}
          previousHref={prevHref}
          nextHref={nextHref}
          courseSlug={slug}
          unitSlug={unitSlug}
          lessonSlug={lessonSlug}
          alreadyCompleted={alreadyCompleted}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <ReadingProgress />
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/courses" className="shrink-0 hover:underline">
          {t('allCourses')}
        </Link>
        <span aria-hidden="true" className="shrink-0">
          /
        </span>
        <Link href={`/courses/${slug}`} className="shrink-0 hover:underline">
          {course.definition.title}
        </Link>
        <span aria-hidden="true" className="shrink-0">
          /
        </span>
        <Link href={`/courses/${slug}/units/${unitSlug}`} className="shrink-0 hover:underline">
          {unit.title}
        </Link>
        <span aria-hidden="true" className="shrink-0">
          /
        </span>
        <span aria-current="page" className="truncate font-medium text-foreground">
          {lesson.title}
        </span>
      </nav>
      <LessonViewer
        courseSlug={slug}
        unitSlug={unitSlug}
        lessonSlug={lessonSlug}
        body={lesson.body}
        title={lesson.title}
        estimatedMinutes={lesson.estimatedMinutes}
        keyTakeaways={keyTakeaways}
        previousHref={prevHref}
        nextHref={nextHref}
        alreadyCompleted={alreadyCompleted}
        locked={locked}
        lockedReason={locked ? t('unlockPrevLesson') : undefined}
        continueHref={continueHref}
        continueTitle={continueTitle ?? undefined}
      />
    </div>
  );
}

async function isLessonCompleted(
  userId: string | null | undefined,
  lessonId: string,
): Promise<boolean> {
  if (!userId) return false;
  const db = getDb() as SqliteDb;
  const [match] = await db
    .select({ id: schema.userProgress.id })
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, userId), eq(schema.userProgress.lessonId, lessonId)))
    .limit(1);
  return Boolean(match);
}
