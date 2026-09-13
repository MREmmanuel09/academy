import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * Achievements (declarative rules) and user_achievements (unlocked).
 *
 * The rule engine (lib/achievements.ts, Phase 2) reads `rule` JSON and
 * evaluates it against a user event payload. Keeping the engine generic
 * means new achievements are just rows, not code.
 */

export const achievements = sqliteTable('achievements', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull().default('🏆'),
  /** XP reward for unlocking. */
  xp: integer('xp').notNull().default(50),
  /**
   * Declarative rule, e.g.:
   *   { kind: 'lesson_count', track: 'devops', count: 5 }
   *   { kind: 'streak', days: 7 }
   *   { kind: 'srs_state', state: 'review', count: 50 }
   */
  rule: text('rule', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userAchievements = sqliteTable(
  'user_achievements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    uq: uniqueIndex('uq_user_achievement').on(t.userId, t.achievementId),
  }),
);

export const activityLog = sqliteTable(
  'activity_log',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** "lesson_completed", "quiz_attempted", "achievement_unlocked",
     *  "srs_reviewed", "streak_extended", "ai_conversation" */
    event: text('event').notNull(),
    payload: text('payload', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`('{}')`),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    userEventIdx: index('idx_activity_user_event').on(t.userId, t.event),
    createdIdx: index('idx_activity_created').on(t.createdAt),
  }),
);

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
