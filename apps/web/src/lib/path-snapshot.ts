import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq, gt } from 'drizzle-orm';
import type { ProgressSnapshot } from './learning-path';

/**
 * Server-only progress snapshot for path gating: completed lesson ids
 * plus best completed-attempt score per exam. Abandoned quiz attempts
 * (durationMs = 0) are ignored.
 */
export async function getProgressSnapshot(
  userId: string | null | undefined,
): Promise<ProgressSnapshot> {
  if (!userId) return { completedLessonIds: new Set(), examBest: {} };
  const db = getDb() as SqliteDb;

  const progressRows = await db
    .select({ lessonId: schema.userProgress.lessonId, status: schema.userProgress.status })
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));
  const completedLessonIds = new Set(
    progressRows.filter((r) => r.status === 'completed').map((r) => r.lessonId),
  );

  const attempts = await db
    .select({ quizId: schema.userQuizAttempts.quizId, score: schema.userQuizAttempts.score })
    .from(schema.userQuizAttempts)
    .where(
      and(eq(schema.userQuizAttempts.userId, userId), gt(schema.userQuizAttempts.durationMs, 0)),
    );
  const examBest: Record<string, number> = {};
  for (const a of attempts) {
    examBest[a.quizId] = Math.max(examBest[a.quizId] ?? 0, a.score);
  }

  return { completedLessonIds, examBest };
}

export interface TopicMastery {
  mastery: number;
  attempts: number;
}

/** Per-topic BKT mastery for the skill heatmap (empty when untouched). */
export async function getMasteryMap(
  userId: string | null | undefined,
): Promise<Record<string, TopicMastery>> {
  if (!userId) return {};
  const db = getDb() as SqliteDb;
  const rows = await db
    .select({
      topic: schema.userSkillMastery.topic,
      mastery: schema.userSkillMastery.mastery,
      attempts: schema.userSkillMastery.attempts,
    })
    .from(schema.userSkillMastery)
    .where(eq(schema.userSkillMastery.userId, userId));
  const out: Record<string, TopicMastery> = {};
  for (const r of rows) out[r.topic] = { mastery: r.mastery, attempts: r.attempts };
  return out;
}
