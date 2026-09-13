import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * Per-user AI configuration. We store the OpenAI / Anthropic / Ollama
 * keys here so the roleplay + writing-feedback server actions can
 * read them with `auth()` but never expose them to the browser.
 *
 * For MVP we only track the OpenAI provider. Adding Anthropic /
 * Ollama is a 3-column change.
 */
export const userAiConfig = sqliteTable('user_ai_config', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  openaiKey: text('openai_key'),
  anthropicKey: text('anthropic_key'),
  ollamaBaseUrl: text('ollama_base_url'),
  /** When true, AI features are enabled for this user. */
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type UserAiConfig = typeof userAiConfig.$inferSelect;
export type NewUserAiConfig = typeof userAiConfig.$inferInsert;
