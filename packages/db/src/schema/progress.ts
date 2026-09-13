import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { lessons } from './content';
import { users } from './users';

/**
 * User progress — lesson completion, quiz attempts, XP, SRS state, streaks.
 *
 * XP / level are denormalised into `user_xp` for fast dashboard reads.
 * Streak data lives in `user_streaks` (UTC timestamps) and is computed
 * client-side via Intl.DateTimeFormat for timezone correctness.
 */

export const userProgress = sqliteTable(
  'user_progress',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    /** Snapshot the lesson version so future edits don't break history. */
    lessonVersion: integer('lesson_version').notNull(),
    status: text('status', { enum: ['in_progress', 'completed'] })
      .notNull()
      .default('in_progress'),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    score: real('score'),
  },
  (t) => ({
    lessonUq: uniqueIndex('uq_user_lesson').on(t.userId, t.lessonId, t.lessonVersion),
    userIdx: index('idx_user_progress_user').on(t.userId),
  }),
);

export const userQuizAttempts = sqliteTable(
  'user_quiz_attempts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    quizId: text('quiz_id').notNull(),
    /** Estimated ability at end of the attempt (theta, IRT scale). */
    finalTheta: real('final_theta'),
    score: real('score').notNull(),
    correctCount: integer('correct_count').notNull(),
    totalCount: integer('total_count').notNull(),
    durationMs: integer('duration_ms').notNull(),
    /** JSON array of { questionId, givenAnswer, correct, ms } for analytics. */
    detail: text('detail', { mode: 'json' })
      .$type<
        Array<{ questionId: string; given: string | string[]; correct: boolean; ms: number }>
      >()
      .notNull()
      .default(sql`('[]')`),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (t) => ({
    userIdx: index('idx_quiz_attempts_user').on(t.userId, t.quizId),
  }),
);

export const userXp = sqliteTable('user_xp', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalXp: integer('total_xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  /** Last XP-gaining event, for rate-limited anti-spam. */
  lastEventAt: integer('last_event_at', { mode: 'timestamp' }),
});

export const userStreaks = sqliteTable('user_streaks', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  /** UTC date (YYYY-MM-DD) of the most recent activity, in the user's TZ. */
  lastActiveDate: text('last_active_date'),
});

export const userAbility = sqliteTable('user_ability', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** IRT theta — single global ability estimate, updated per quiz attempt. */
  theta: real('theta').notNull().default(0),
  /** Standard error of the theta estimate. */
  se: real('se').notNull().default(1),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userSkillMastery = sqliteTable(
  'user_skill_mastery',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Topic key, e.g. `devops/linux` (course/unit). */
    topic: text('topic').notNull(),
    /** P(known) 0-1 via Bayesian Knowledge Tracing. */
    mastery: real('mastery').notNull().default(0.3),
    attempts: integer('attempts').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    userTopicUq: uniqueIndex('uq_user_topic').on(t.userId, t.topic),
    userIdx: index('idx_skill_mastery_user').on(t.userId),
  }),
);

export type UserProgress = typeof userProgress.$inferSelect;
export type UserQuizAttempt = typeof userQuizAttempts.$inferSelect;
export type UserXp = typeof userXp.$inferSelect;
export type UserStreaks = typeof userStreaks.$inferSelect;
export type UserAbility = typeof userAbility.$inferSelect;
export type UserSkillMastery = typeof userSkillMastery.$inferSelect;
