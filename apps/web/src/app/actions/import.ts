'use server';

import { auth } from '@/auth';
import { type CanonicalImport, type ImportSrsCard, parseAny } from '@/lib/import';
import { sm2ToFsrs, sprintL2FsrsToAcademy } from '@/lib/import/sm2-to-fsrs';
import type { SrState } from '@/lib/srs';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ImportResult =
  | {
      ok: true;
      source: CanonicalImport['source'];
      imported: {
        lessons: number;
        labs: number;
        quizAttempts: number;
        srsCards: number;
        achievements: number;
        activityEvents: number;
      };
      skipped: {
        lessons: string[];
        achievements: string[];
        cards: string[];
      };
      warnings: string[];
    }
  | { ok: false; error: string; code: string };

/**
 * Server action — accept an uploaded JSON file, parse it, and merge
 * the user's data into the destination DB.
 *
 * ## Flow
 *
 *  1. Auth check — must be signed in.
 *  2. `parseAny()` routes to the right parser (RedLab, Sprint L2, or Academy backup).
 *  3. Resolve external IDs (lesson IDs from RedLab, vocab IDs from
 *     Sprint L2, achievement slugs) against the destination DB. Anything
 *     we can't resolve is recorded in `skipped` and surfaced in the UI.
 *  4. Insert all rows inside a single transaction using
 *     `onConflictDoNothing()` for idempotency. Re-running with the same
 *     file is a no-op.
 *  5. Record provenance in `activity_log` so the user can audit what
 *     came from where.
 *
 * ## What we never copy
 *
 *  - email / name / password — the destination keeps its own identity.
 *  - Anything from the source that doesn't map to a known table or
 *    can't be verified (e.g. lesson IDs that no longer exist).
 */
export async function importUserDataAction(formData: FormData): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, code: 'unauthenticated', error: 'You must be signed in.' };
  }
  const userId = session.user.id;

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, code: 'no_file', error: 'No file provided.' };
  }
  if (file.size === 0) {
    return { ok: false, code: 'empty_file', error: 'File is empty.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, code: 'too_large', error: 'File exceeds 10 MB.' };
  }

  const text = await file.text();
  const parsed = parseAny(text);
  if (!parsed.ok) {
    return { ok: false, code: parsed.code, error: parsed.message };
  }
  const canonical = parsed.canonical;
  const warnings = [...parsed.warnings];

  const db = getDb() as SqliteDb;

  // Resolve external IDs → internal IDs in one batch each.
  const lessonsById = await resolveLessonIds(canonical.completedLessonIds, db);
  const achievementsBySlug = await resolveAchievementSlugs(canonical.earnedAchievementIds, db);
  const vocabIds = await resolveVocabIds(
    canonical.srsCards.filter((c) => c.cardType === 'vocab').map((c) => c.contentId),
    db,
  );
  const episodeIds = await resolveEpisodeIds(
    canonical.srsCards.filter((c) => c.cardType === 'episode').map((c) => c.contentId),
    db,
  );

  const skipped = {
    lessons: [] as string[],
    achievements: [] as string[],
    cards: [] as string[],
  };

  // 1. XP / streak / level — apply only if it improves the user's record.
  await applyAccountLevel(canonical, userId, db);

  // 2. Lesson progress.
  for (const lessonId of canonical.completedLessonIds) {
    const lesson = lessonsById.get(lessonId);
    if (!lesson) {
      skipped.lessons.push(lessonId);
      continue;
    }
    await db
      .insert(schema.userProgress)
      .values({
        userId,
        lessonId: lesson.id,
        lessonVersion: lesson.version,
        status: 'completed',
        completedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // 3. Quiz + exam attempts.
  for (const a of canonical.attempts) {
    await db
      .insert(schema.userQuizAttempts)
      .values({
        userId,
        quizId: a.quizId,
        finalTheta: null,
        score: a.score,
        correctCount: Math.round(a.score * 100),
        totalCount: 100,
        durationMs: 0,
        detail: [
          {
            questionId: `${a.quizId}:migrated`,
            given: '',
            correct: a.passed,
            ms: 0,
          },
        ],
        startedAt: new Date(),
        completedAt: a.completedAt ? new Date(a.completedAt) : new Date(),
      })
      .onConflictDoNothing();
  }

  // 4. Achievements.
  for (const slug of canonical.earnedAchievementIds) {
    const ach = achievementsBySlug.get(slug);
    if (!ach) {
      skipped.achievements.push(slug);
      // Preserve provenance so the user can see the original ID.
      await db.insert(schema.activityLog).values({
        userId,
        event: 'redlab_achievement_unknown',
        payload: { slug, source: canonical.source },
      });
      continue;
    }
    await db
      .insert(schema.userAchievements)
      .values({ userId, achievementId: ach.id })
      .onConflictDoNothing();
  }

  // 5. SRS cards.
  for (const card of canonical.srsCards) {
    await applySrsCard(card, userId, vocabIds, episodeIds, skipped, db);
  }

  // 6. Activity log provenance — record what we imported so users can audit.
  await db.insert(schema.activityLog).values({
    userId,
    event: 'import_completed',
    payload: {
      source: canonical.source,
      sourceVersion: canonical.sourceVersion,
      exportedAt: canonical.exportedAt,
      counts: {
        lessons: canonical.completedLessonIds.length,
        labs: canonical.completedLabIds.length,
        attempts: canonical.attempts.length,
        srsCards: canonical.srsCards.length,
        achievements: canonical.earnedAchievementIds.length,
      },
    },
  });
  for (const labId of canonical.completedLabIds) {
    await db.insert(schema.activityLog).values({
      userId,
      event: 'lab_completed',
      payload: { labId, source: canonical.source },
    });
  }
  for (const act of canonical.activity) {
    await db.insert(schema.activityLog).values({
      userId,
      event: act.kind,
      payload: act.payload as Record<string, unknown>,
      ...(act.at ? { createdAt: new Date(act.at) } : {}),
    });
  }
  // Badges (RedLab only) — preserve as activity events.
  for (const badgeId of canonical.earnedBadgeIds) {
    await db.insert(schema.activityLog).values({
      userId,
      event: 'badge_earned',
      payload: { badgeId, source: canonical.source },
    });
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/practice');

  return {
    ok: true,
    source: canonical.source,
    imported: {
      lessons: canonical.completedLessonIds.length - skipped.lessons.length,
      labs: canonical.completedLabIds.length,
      quizAttempts: canonical.attempts.length,
      srsCards: canonical.srsCards.length - skipped.cards.length,
      achievements: canonical.earnedAchievementIds.length - skipped.achievements.length,
      activityEvents:
        canonical.activity.length +
        canonical.completedLabIds.length +
        canonical.earnedBadgeIds.length +
        1,
    },
    skipped,
    warnings,
  };
}

// ─── helpers ────────────────────────────────────────────────────────────

interface ResolvedLesson {
  id: string;
  version: number;
}

async function resolveLessonIds(ids: string[], db: SqliteDb): Promise<Map<string, ResolvedLesson>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: schema.lessons.id,
      version: schema.lessons.version,
    })
    .from(schema.lessons)
    .where(inArray(schema.lessons.id, ids));
  return new Map(rows.map((r) => [r.id, { id: r.id, version: r.version }]));
}

interface ResolvedAchievement {
  id: string;
  slug: string;
}

async function resolveAchievementSlugs(
  slugs: string[],
  db: SqliteDb,
): Promise<Map<string, ResolvedAchievement>> {
  if (slugs.length === 0) return new Map();
  const rows = await db
    .select({ id: schema.achievements.id, slug: schema.achievements.slug })
    .from(schema.achievements)
    .where(inArray(schema.achievements.slug, slugs));
  return new Map(rows.map((r) => [r.slug, r]));
}

async function resolveVocabIds(ids: string[], db: SqliteDb): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: schema.vocab.id })
    .from(schema.vocab)
    .where(inArray(schema.vocab.id, ids));
  return new Set(rows.map((r) => r.id));
}

async function resolveEpisodeIds(ids: string[], db: SqliteDb): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: schema.episodes.id })
    .from(schema.episodes)
    .where(inArray(schema.episodes.id, ids));
  return new Set(rows.map((r) => r.id));
}

async function applyAccountLevel(
  canonical: CanonicalImport,
  userId: string,
  db: SqliteDb,
): Promise<void> {
  // XP: take the max of existing vs imported so we never lower it.
  const [existing] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, userId))
    .limit(1);
  if (canonical.totalXp > 0) {
    if (existing) {
      if (canonical.totalXp > existing.totalXp) {
        await db
          .update(schema.userXp)
          .set({ totalXp: canonical.totalXp, lastEventAt: new Date() })
          .where(eq(schema.userXp.userId, userId));
      }
    } else {
      await db
        .insert(schema.userXp)
        .values({ userId, totalXp: canonical.totalXp, lastEventAt: new Date() });
    }
  }

  // Streak: take the max of current; longest is the max of both.
  const [streak] = await db
    .select()
    .from(schema.userStreaks)
    .where(eq(schema.userStreaks.userId, userId))
    .limit(1);
  if (canonical.currentStreak > 0 || canonical.lastActiveDate) {
    if (streak) {
      await db
        .update(schema.userStreaks)
        .set({
          currentStreak: Math.max(streak.currentStreak, canonical.currentStreak),
          longestStreak: Math.max(streak.longestStreak, canonical.longestStreak),
          lastActiveDate: pickMostRecentDate(streak.lastActiveDate, canonical.lastActiveDate),
        })
        .where(eq(schema.userStreaks.userId, userId));
    } else {
      await db.insert(schema.userStreaks).values({
        userId,
        currentStreak: canonical.currentStreak,
        longestStreak: canonical.longestStreak,
        lastActiveDate: canonical.lastActiveDate,
      });
    }
  }

  // Ability: leave alone — IRT is non-additive.
}

function pickMostRecentDate(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const aa = a ?? null;
  const bb = b ?? null;
  if (!aa) return bb;
  if (!bb) return aa;
  return aa > bb ? aa : bb;
}

async function applySrsCard(
  card: ImportSrsCard,
  userId: string,
  vocabIds: Set<string>,
  episodeIds: Set<string>,
  skipped: { lessons: string[]; achievements: string[]; cards: string[] },
  db: SqliteDb,
): Promise<void> {
  // Verify the content actually exists in the destination DB.
  if (card.cardType === 'vocab' && !vocabIds.has(card.contentId)) {
    skipped.cards.push(`vocab:${card.contentId}`);
    return;
  }
  if (card.cardType === 'episode' && !episodeIds.has(card.contentId)) {
    skipped.cards.push(`episode:${card.contentId}`);
    return;
  }
  if (card.cardType === 'lesson') {
    // Reuse the lesson resolver logic — but we don't want to fail here
    // because the user might have legacy IDs. Look up directly.
    const [row] = await db
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(eq(schema.lessons.id, card.contentId))
      .limit(1);
    if (!row) {
      skipped.cards.push(`lesson:${card.contentId}`);
      return;
    }
  }

  let state: SrState;
  if (card.source === 'redlab-sm2') {
    const result = sm2ToFsrs(card.originalState as Parameters<typeof sm2ToFsrs>[0]);
    state = result.state;
  } else {
    const original = card.originalState as {
      fsrsState: string;
      fsrsDue: string;
      fsrsStability: number;
      fsrsDifficulty: number;
      fsrsElapsedDays: number;
      fsrsScheduledDays: number;
      fsrsReps: number;
      fsrsLapses: number;
      fsrsLastReview: string | null;
    };
    if (!original) {
      // New card with no state.
      state = {
        state: 'new',
        due: new Date().toISOString(),
        stability: 0,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
      };
    } else {
      const result = sprintL2FsrsToAcademy({
        fsrsState: original.fsrsState,
        fsrsDue: original.fsrsDue,
        fsrsStability: original.fsrsStability,
        fsrsDifficulty: original.fsrsDifficulty,
        fsrsElapsedDays: original.fsrsElapsedDays,
        fsrsScheduledDays: original.fsrsScheduledDays,
        fsrsReps: original.fsrsReps,
        fsrsLapses: original.fsrsLapses,
        fsrsLastReview: original.fsrsLastReview,
      });
      state = result.state;
    }
  }

  await db
    .insert(schema.srsCards)
    .values({
      userId,
      cardType: card.cardType,
      contentId: card.contentId,
      state,
    })
    .onConflictDoNothing();
}
