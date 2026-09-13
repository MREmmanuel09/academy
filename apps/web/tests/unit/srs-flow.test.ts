import { existsSync } from 'node:fs';
import { createInitialCard, deserializeState, serializeState } from '@/lib/srs';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';
/**
 * Integration test: SRS persistence to a real SQLite DB.
 *
 * We don't go through the server actions (those need an auth
 * session) — we exercise the underlying queries the actions use.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_READY = existsSync('apps/web/data/dev.db');
const describeIf = DB_READY ? describe : describe.skip;

describeIf('SRS flow (DB)', () => {
  let db: SqliteDb;
  let userId: string;

  beforeAll(async () => {
    db = getDb() as SqliteDb;
    const id = `srs-test-${Date.now()}`;
    await db.insert(schema.users).values({
      id,
      email: `${id}@test.local`,
      name: 'SRS Test',
      preferredLocale: 'es',
      timezone: 'UTC',
    });
    userId = id;
  });

  afterAll(async () => {
    if (!userId) return;
    await db.delete(schema.srsCards).where(eq(schema.srsCards.userId, userId));
    await db.delete(schema.userXp).where(eq(schema.userXp.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it('inserts and reads back a card state via the schema', async () => {
    const cardId = `c-${Date.now()}`;
    const initial = createInitialCard();
    await db.insert(schema.srsCards).values({
      id: cardId,
      userId,
      cardType: 'vocab',
      contentId: 'test-content',
      state: serializeState(initial) as unknown as typeof schema.srsCards.$inferInsert.state,
    });
    const [row] = await db
      .select()
      .from(schema.srsCards)
      .where(and(eq(schema.srsCards.id, cardId), eq(schema.srsCards.userId, userId)))
      .limit(1);
    expect(row).toBeDefined();
    if (!row) return;
    const parsed = deserializeState(row.state as unknown as string);
    expect(parsed).not.toBeNull();
    if (parsed === null) return;
    expect(parsed.state).toBe('new');
    expect(parsed.reps).toBe(0);
  });

  it('counts SRS cards belonging to this user', async () => {
    const cardId = `c2-${Date.now()}`;
    await db.insert(schema.srsCards).values({
      id: cardId,
      userId,
      cardType: 'vocab',
      contentId: 'count-test',
      state: serializeState(
        createInitialCard(),
      ) as string as unknown as typeof schema.srsCards.$inferInsert.state,
    });
    const rows = await db
      .select({ id: schema.srsCards.id })
      .from(schema.srsCards)
      .where(eq(schema.srsCards.userId, userId));
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
