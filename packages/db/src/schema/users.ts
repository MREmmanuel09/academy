import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp' }),
  name: text('name'),
  image: text('image'),
  passwordHash: text('password_hash'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  demoExpiresAt: integer('demo_expires_at', { mode: 'timestamp' }),
  preferredLocale: text('preferred_locale').notNull().default('es'),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
