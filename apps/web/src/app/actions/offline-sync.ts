'use server';

/**
 * Server action to sync offline mutations.
 *
 * This action receives a queued mutation from the client and executes
 * the corresponding server action. Used by the offline sync system
 * to replay mutations when connectivity returns.
 */

import { auth } from '@/auth';
import type { SrRating } from '@/lib/srs';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';

export type SyncResult = { ok: true } | { ok: false; error: string };

/**
 * Sync a single offline mutation.
 * Validates authentication and executes the mutation atomically.
 */
export async function syncOfflineMutation(mutation: {
  action: string;
  payload: unknown;
}): Promise<SyncResult> {
  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not authenticated' };
  }

  const userId = session.user.id;

  try {
    switch (mutation.action) {
      case 'reviewSrsCard': {
        const { cardId, rating } = mutation.payload as {
          cardId: string;
          rating: SrRating;
        };

        const db = getDb() as SqliteDb;

        // Verify the card belongs to the user
        const [card] = await db
          .select()
          .from(schema.srsCards)
          .where(and(eq(schema.srsCards.id, cardId), eq(schema.srsCards.userId, userId)))
          .limit(1);

        if (!card) {
          return { ok: false, error: 'Card not found' };
        }

        // Import and apply FSRS-6 review
        const { reviewCard } = await import('@/lib/srs');
        const currentState = card.state;
        const newState = reviewCard(currentState, rating);

        // Update the card - state is already typed as JSON, due lives inside state
        await db
          .update(schema.srsCards)
          .set({
            state: newState as typeof schema.srsCards.$inferInsert.state,
          })
          .where(eq(schema.srsCards.id, cardId));

        return { ok: true };
      }

      case 'markLessonComplete': {
        const { courseSlug, unitSlug, lessonSlug } = mutation.payload as {
          courseSlug: string;
          unitSlug: string;
          lessonSlug: string;
        };

        const { loadCourse } = await import('@academy/content');
        const course = loadCourse(courseSlug);

        if (!course) {
          return { ok: false, error: 'Course not found' };
        }

        // Find the lesson in the course
        const unit = course.units.find((u) => u.slug === unitSlug);
        if (!unit) {
          return { ok: false, error: 'Unit not found' };
        }

        const lesson = unit.lessons.find((l) => l.slug === lessonSlug);
        if (!lesson) {
          return { ok: false, error: 'Lesson not found' };
        }

        const db = getDb() as SqliteDb;

        // Same FK-parent guarantee as the online action: the content
        // tables are never seeded.
        const { ensureLessonContentRows } = await import('@/lib/content-rows');
        await ensureLessonContentRows(db, courseSlug, course, unitSlug, unit, lesson);

        // Check if already completed at current version
        const [existing] = await db
          .select()
          .from(schema.userProgress)
          .where(
            and(
              eq(schema.userProgress.userId, userId),
              eq(schema.userProgress.lessonId, lesson.id),
            ),
          )
          .limit(1);

        const lessonVersion = 1;

        if (existing && existing.lessonVersion >= lessonVersion) {
          // Already completed at current version, no-op
          return { ok: true };
        }

        // Insert or update progress
        if (existing) {
          await db
            .update(schema.userProgress)
            .set({
              status: 'completed',
              completedAt: new Date(),
              lessonVersion,
            })
            .where(eq(schema.userProgress.id, existing.id));
        } else {
          await db.insert(schema.userProgress).values({
            userId,
            lessonId: lesson.id,
            lessonVersion,
            status: 'completed',
            completedAt: new Date(),
          });
        }

        return { ok: true };
      }

      default:
        return { ok: false, error: `Unknown action: ${mutation.action}` };
    }
  } catch (error) {
    console.error('Error syncing mutation:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
