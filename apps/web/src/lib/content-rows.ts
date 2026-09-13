import type { CourseContent, Lesson, Unit } from '@academy/content';
import { type SqliteDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';

/**
 * Ensure the FK-parent content rows (`courses` → `units` → `lessons`)
 * exist for a filesystem lesson.
 *
 * The content tables may be empty (dev DB, never seeded) or populated
 * by the production seed, which uses its own row IDs. So instead of
 * assuming deterministic IDs, each level is resolved by its natural
 * key (slug) and only created when missing — pointing at the resolved
 * parent. All creates are additionally guarded by
 * `onConflictDoNothing()`, making this safe under concurrent calls.
 *
 * Without this, inserts into `user_progress` fail with
 * `FOREIGN KEY constraint failed` because `lesson_id → lessons.id`
 * has nothing to reference.
 */
export async function ensureLessonContentRows(
  db: SqliteDb,
  courseSlug: string,
  course: CourseContent,
  unitSlug: string,
  unit: Unit,
  lesson: Lesson,
): Promise<void> {
  // 1. Course — resolve by slug (unique).
  const [existingCourse] = await db
    .select({ id: schema.courses.id })
    .from(schema.courses)
    .where(eq(schema.courses.slug, courseSlug))
    .limit(1);
  let courseRowId = existingCourse?.id;
  if (!courseRowId) {
    courseRowId = `course:${courseSlug}`;
    await db
      .insert(schema.courses)
      .values({
        id: courseRowId,
        slug: courseSlug,
        track: course.definition.track,
        title: course.definition.title,
        description: course.definition.description,
        difficulty: course.definition.difficulty,
        estimatedHours: course.definition.estimatedHours,
      })
      .onConflictDoNothing();
    // A concurrent caller may have inserted a row with a different id
    // (e.g. the seed's UUID) between our select and insert — re-resolve
    // so the unit below always points at a row that really exists.
    const [raced] = await db
      .select({ id: schema.courses.id })
      .from(schema.courses)
      .where(eq(schema.courses.slug, courseSlug))
      .limit(1);
    courseRowId = raced?.id ?? courseRowId;
  }

  // 2. Unit — resolve by (courseId, slug) unique key.
  const [existingUnit] = await db
    .select({ id: schema.units.id })
    .from(schema.units)
    .where(and(eq(schema.units.courseId, courseRowId), eq(schema.units.slug, unitSlug)))
    .limit(1);
  let unitRowId = existingUnit?.id;
  if (!unitRowId) {
    unitRowId = `unit:${courseSlug}:${unitSlug}`;
    await db
      .insert(schema.units)
      .values({
        id: unitRowId,
        courseId: courseRowId,
        slug: unitSlug,
        title: unit.title,
        order: unit.order ?? 0,
      })
      .onConflictDoNothing();
    const [raced] = await db
      .select({ id: schema.units.id })
      .from(schema.units)
      .where(and(eq(schema.units.courseId, courseRowId), eq(schema.units.slug, unitSlug)))
      .limit(1);
    unitRowId = raced?.id ?? unitRowId;
  }

  // 3. Lesson — the progress code references the loader (frontmatter)
  // id, and the production seed uses that same id as PK, so resolve by
  // PK first and only create when truly absent.
  const [existingLesson] = await db
    .select({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(eq(schema.lessons.id, lesson.id))
    .limit(1);
  if (!existingLesson) {
    await db
      .insert(schema.lessons)
      .values({
        id: lesson.id,
        unitId: unitRowId,
        slug: lesson.slug,
        title: lesson.title,
        order: lesson.order ?? 0,
        estimatedMinutes: lesson.estimatedMinutes ?? 10,
      })
      .onConflictDoNothing();
  }
}
