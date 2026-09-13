import { buildStudyGuide } from '@/lib/study-guide';
import { loadCourse, loadPath } from '@academy/content';
import { notFound } from 'next/navigation';

/**
 * Downloadable study guide for a learning path (`GET /api/paths/:id/guide`).
 *
 * Renders the whole path — levels, units with objectives, lessons with
 * durations, and gating exams with thresholds — as Markdown with a
 * `Content-Disposition: attachment` so browsers download it. Pure
 * content read (no DB), so it works identically in every environment.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = loadPath(id);
  if (!path) notFound();
  const course = loadCourse(path.course);
  if (!course) notFound();

  const body = buildStudyGuide(path, course);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${path.id}-study-guide.md"`,
    },
  });
}
