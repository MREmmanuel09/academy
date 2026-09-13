import { LabViewer } from '@/components/lab-viewer';
import { Link } from '@/components/link';
import { loadCourse } from '@academy/content';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface LabPageProps {
  params: Promise<{ locale: string; slug: string; labSlug: string }>;
}

export default async function LabPage({ params }: LabPageProps) {
  const { locale, slug, labSlug } = await params;
  setRequestLocale(locale);

  const course = loadCourse(slug);
  if (!course) notFound();

  // Lab can be in any unit; find the first one that has it.
  let foundLab = null;
  let foundUnitSlug: string | null = null;
  for (const u of course.units) {
    const lab = u.labs.find((l) => l.slug === labSlug);
    if (lab) {
      foundLab = lab;
      foundUnitSlug = u.slug;
      break;
    }
  }
  if (!foundLab || !foundUnitSlug) notFound();
  const t = await getTranslations('courseBrowser');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
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
        <span aria-current="page" className="truncate font-medium text-foreground">
          {foundLab.title}
        </span>
      </nav>
      <LabViewer courseSlug={slug} unitSlug={foundUnitSlug} lab={foundLab} />
    </div>
  );
}
