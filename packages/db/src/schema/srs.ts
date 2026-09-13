import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * Spaced Repetition System — FSRS-6 state.
 *
 * We persist the full FSRS `Card` JSON (state, due, stability, difficulty,
 * elapsed_days, scheduled_days, reps, lapses, last_review, history) so the
 * scheduler can resume exactly where it left off across devices. The
 * library (ts-fsrs) handles serialization in v4+.
 */

export const srsCards = sqliteTable(
  'srs_cards',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Polymorphic: "lesson", "vocab", "roleplay-line", "episode", "quiz". */
    cardType: text('card_type', {
      enum: ['lesson', 'vocab', 'roleplay', 'episode', 'quiz'],
    }).notNull(),
    /** ID of the underlying content (lesson, vocab word, etc). */
    contentId: text('content_id').notNull(),
    /** FSRS-6 state serialized as JSON. Shape:
     *  { state, due, stability, difficulty, elapsed_days,
     *    scheduled_days, reps, lapses, last_review, history } */
    state: text('state', { mode: 'json' })
      .$type<{
        state: 'new' | 'learning' | 'review' | 'relearning';
        due: string;
        stability: number;
        difficulty: number;
        elapsed_days: number;
        scheduled_days: number;
        reps: number;
        lapses: number;
        last_review?: string;
        history?: unknown[];
      }>()
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    cardUq: uniqueIndex('uq_user_card').on(t.userId, t.cardType, t.contentId),
    dueIdx: index('idx_srs_due').on(t.userId),
  }),
);

export const vocab = sqliteTable(
  'vocab',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    term: text('term').notNull(),
    /** English source term. */
    termEn: text('term_en'),
    translation: text('translation').notNull(),
    /** Spanish translation. */
    translationEs: text('translation_es'),
    partOfSpeech: text('part_of_speech', {
      enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'],
    }).notNull(),
    definitionEn: text('definition_en'),
    definitionEs: text('definition_es'),
    exampleEn: text('example_en'),
    exampleEs: text('example_es'),
    audioUrl: text('audio_url'),
    /** Which Sprint L2 episode / arc introduced this word. */
    arcSlug: text('arc_slug'),
    episodeSlug: text('episode_slug'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    arcIdx: index('idx_vocab_arc').on(t.arcSlug),
  }),
);

export type SrsCard = typeof srsCards.$inferSelect;
export type NewSrsCard = typeof srsCards.$inferInsert;
export type Vocab = typeof vocab.$inferSelect;
export type NewVocab = typeof vocab.$inferInsert;
