import { Link } from '@/components/link';
import { loadCourse } from '@academy/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@academy/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface ProjectPageProps {
  params: Promise<{ locale: string; slug: string; projectSlug: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { locale, slug, projectSlug } = await params;
  setRequestLocale(locale);

  const course = loadCourse(slug);
  if (!course) notFound();
  const project = course.projects.find((p) => p.slug === projectSlug);
  if (!project) notFound();

  const t = await getTranslations('courseBrowser');

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
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
      <header className="mb-8 space-y-3 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
      </header>

      <section className="mb-6 space-y-2">
        <h2 className="text-xl font-semibold">Escenario</h2>
        <p className="whitespace-pre-line text-muted-foreground">{project.scenario}</p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="text-xl font-semibold">Meta</h2>
        <p className="text-muted-foreground">{project.goal}</p>
      </section>

      {project.deliverables.length > 0 ? (
        <section className="mb-6 space-y-2">
          <h2 className="text-xl font-semibold">Deliverables</h2>
          <ul className="ml-5 list-disc space-y-1">
            {project.deliverables.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.tech.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Tech</h2>
          <div className="flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <span
                key={t}
                className="rounded bg-secondary px-2 py-1 text-xs uppercase tracking-wide text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="mt-10 border-dashed bg-muted/50">
        <CardHeader>
          <CardTitle>Project workspace</CardTitle>
          <CardDescription>
            Interactive project runner ships in Fase 7. For now, the deliverables and tech stack
            above are the contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/courses/${slug}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              ← {t('backToCourse')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
