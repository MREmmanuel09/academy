import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { courses } from './content';

/**
 * Sprint L2 domain — English learning through narrative arcs.
 *
 * Arc -> Episode (5 per arc, 6 arcs total = 30 episodes).
 * Roleplays live as JSON scripts (turns[] with { speaker, prompt, hints }).
 */

export const arcs = sqliteTable('arcs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  order: integer('order').notNull(),
  color: text('color').notNull().default('#1e40af'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const episodes = sqliteTable(
  'episodes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    arcId: text('arc_id')
      .notNull()
      .references(() => arcs.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    order: integer('order').notNull(),
    /** Markdown body of the episode narrative. */
    body: text('body').notNull().default(''),
    audioUrl: text('audio_url'),
    estimatedMinutes: integer('estimated_minutes').notNull().default(15),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    slugUq: uniqueIndex('uq_episode_slug').on(t.arcId, t.slug),
  }),
);

export const roleplays = sqliteTable(
  'roleplays',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    episodeId: text('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    scenario: text('scenario').notNull(),
    /** Script turns: { id, speaker, prompt (en), promptEs, hints[], expectedKeywords[] } */
    script: text('script', { mode: 'json' })
      .$type<
        Array<{
          id: string;
          speaker: 'user' | 'ai' | 'npc';
          prompt: string;
          promptEs?: string;
          hints?: string[];
          expectedKeywords?: string[];
        }>
      >()
      .notNull(),
    difficulty: text('difficulty', {
      enum: ['easy', 'medium', 'hard'],
    })
      .notNull()
      .default('medium'),
    order: integer('order').notNull().default(0),
  },
  (t) => ({
    slugUq: uniqueIndex('uq_roleplay_slug').on(t.episodeId, t.slug),
  }),
);

export const miniGames = sqliteTable(
  'mini_games',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    episodeId: text('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    type: text('type', {
      enum: ['word-match', 'fill-blank', 'listening', 'sentence-builder', 'speed-quiz'],
    }).notNull(),
    title: text('title').notNull(),
    /** Game-specific config JSON. */
    config: text('config', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`('{}')`),
  },
  (t) => ({
    typeIdx: index('idx_minigame_type').on(t.type),
  }),
);

export type Arc = typeof arcs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Roleplay = typeof roleplays.$inferSelect;
export type MiniGame = typeof miniGames.$inferSelect;
