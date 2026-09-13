import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * AI feedback — conversations with optional multi-provider AI (OpenAI,
 * Anthropic, Ollama). Off by default; opt-in per-user in settings.
 *
 * Each conversation is a thread (e.g. one roleplay session). Messages
 * and feedback scores are stored for analytics + rate limiting.
 */

export const aiConversations = sqliteTable(
  'ai_conversations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** "roleplay", "writing", "general" */
    kind: text('kind', { enum: ['roleplay', 'writing', 'general'] }).notNull(),
    /** Polymorphic: roleplayId, lessonId, or null for general chat. */
    contextId: text('context_id'),
    provider: text('provider', { enum: ['openai', 'anthropic', 'ollama', 'mock'] })
      .notNull()
      .default('mock'),
    /** Full message log: [{ role, content, ts, tokens? }] */
    messages: text('messages', { mode: 'json' })
      .$type<
        Array<{
          role: 'user' | 'assistant' | 'system';
          content: string;
          ts: string;
          tokens?: number;
        }>
      >()
      .notNull()
      .default(sql`('[]')`),
    /** Aggregate metrics. */
    totalTokens: integer('total_tokens').notNull().default(0),
    costUsd: real('cost_usd').notNull().default(0),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
  },
  (t) => ({
    userIdx: index('idx_ai_conv_user').on(t.userId, t.kind),
  }),
);

export const aiFeedback = sqliteTable(
  'ai_feedback',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    /** Grammar, vocabulary, fluency, pronunciation, overall. */
    dimension: text('dimension', {
      enum: ['grammar', 'vocabulary', 'fluency', 'pronunciation', 'overall'],
    }).notNull(),
    score: real('score').notNull(),
    /** Free-form feedback text (e.g. "Watch your verb tenses in sentence 2"). */
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    convIdx: index('idx_feedback_conv').on(t.conversationId),
  }),
);

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiFeedback = typeof aiFeedback.$inferSelect;
