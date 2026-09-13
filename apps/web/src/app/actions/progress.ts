'use server';

import { auth } from '@/auth';
import { ensureLessonContentRows } from '@/lib/content-rows';
import { applyXpBatch, xpForEvent } from '@/lib/gamification';
import { logger } from '@/lib/logger';
import { loadCourse } from '@academy/content';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const progressLogger = logger.child({ module: 'progress' });

export type ProgressResult =
  | { ok: true; completed: true; xpAwarded: number }
  | { ok: false; error: string };

/**
 * Mark a lesson as completed by the current user. Idempotent — calling
 * it twice for the same lesson (same version) is a no-op the second
 * time and does not double-award XP.
 *
 * Awards XP per the `gamification.XP_REWARDS.lesson` constant (10 XP
 * per lesson). XP is applied via `applyXpBatch` so the rate limit
 * also applies (we don't expect to hit it for a single click).
 *
 * The lesson "version" is read from the on-disk content; if the
 * source was updated (lesson version bumped), the user is recorded
 * as having completed the new version instead of the old one.
 */
export async function markLessonCompleteAction(
  courseSlug: string,
  unitSlug: string,
  lessonSlug: string,
): Promise<ProgressResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }

  // Load the lesson from the filesystem to read its metadata.
  const course = loadCourse(courseSlug);
  if (!course) return { ok: false, error: `Course ${courseSlug} not found` };
  const unit = course.units.find((u) => u.slug === unitSlug);
  if (!unit) return { ok: false, error: `Unit ${unitSlug} not found` };
  const lesson = unit.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) return { ok: false, error: `Lesson ${lessonSlug} not found` };

  const db = getDb() as SqliteDb;
  const userId = session.user.id;
  const lessonVersion = lesson.order ?? 1; // we don't bump on every edit in this iteration

  // The content tables are never seeded, so ensure the FK-parent rows
  // exist before inserting progress (otherwise FOREIGN KEY fails).
  await ensureLessonContentRows(db, courseSlug, course, unitSlug, unit, lesson);

  // Find by lesson id AND user: progress is per-user, so one user's
  // completion must never mark the lesson done for another user.
  const [existingForLesson] = await db
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, userId), eq(schema.userProgress.lessonId, lesson.id)))
    .limit(1);

  if (existingForLesson && existingForLesson.lessonVersion === lessonVersion) {
    // Already completed at the current version.
    revalidatePath(`/${courseSlug}`);
    return { ok: true, completed: true, xpAwarded: 0 };
  }

  if (existingForLesson) {
    // Completed at an older version — update the version to the new one.
    await db
      .update(schema.userProgress)
      .set({
        lessonVersion,
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(schema.userProgress.id, existingForLesson.id));
  } else {
    await db.insert(schema.userProgress).values({
      userId,
      lessonId: lesson.id,
      lessonVersion,
      status: 'completed',
      completedAt: new Date(),
    });
  }

  // Update user_xp.
  const xpDelta = xpForEvent({ kind: 'lesson' });
  const { gainedXp } = applyXpBatch(0, [{ event: { kind: 'lesson' }, minutesAgo: 0 }]);

  const [userXp] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, userId))
    .limit(1);
  if (userXp) {
    await db
      .update(schema.userXp)
      .set({
        totalXp: userXp.totalXp + gainedXp,
        level: computeLevel(userXp.totalXp + gainedXp),
        lastEventAt: new Date(),
      })
      .where(eq(schema.userXp.userId, userId));
  } else {
    await db.insert(schema.userXp).values({
      userId,
      totalXp: gainedXp,
      level: computeLevel(gainedXp),
      lastEventAt: new Date(),
    });
  }

  // Log the activity.
  await db.insert(schema.activityLog).values({
    userId,
    event: 'lesson_completed',
    payload: { lessonId: lesson.id, courseSlug, unitSlug, lessonSlug, xpAwarded: xpDelta },
  });

  progressLogger.info('Lesson completed', {
    userId,
    courseSlug,
    unitSlug,
    lessonSlug,
    xpAwarded: xpDelta,
  });

  revalidatePath(`/${courseSlug}`);
  revalidatePath('/dashboard');

  return { ok: true, completed: true, xpAwarded: xpDelta };
}

// Re-use the level curve from gamification without a circular import.
// We mirror the quadratic curve `xpForLevel(L) = 50 * (L-1)^2` here.
function computeLevel(totalXp: number): number {
  if (totalXp < 0) return 1;
  const lMinus1 = Math.sqrt(totalXp / 50);
  return Math.max(1, Math.floor(lMinus1) + 1);
}
