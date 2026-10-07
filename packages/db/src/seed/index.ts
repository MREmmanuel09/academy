/**
 * Idempotent dev seed. Safe to run multiple times.
 *
 * Phase 0 ships only the users stub. Subsequent phases will extend this
 * to include courses, lessons, achievements, SRS cards, and vocab.
 *
 * The seed runs against the local SQLite dev DB. A separate prod seed
 * will live alongside it for PostgreSQL deployments.
 */
import { eq } from 'drizzle-orm';
import type { SqliteDb } from '../client';
import { getDb, schema } from '../client';

const DEMO_USERS = [
  {
    email: 'demo@academy.local',
    name: 'Demo User',
    isDemo: true,
    preferredLocale: 'es',
  },
  {
    email: 'admin@academy.local',
    name: 'Admin',
    isDemo: false,
    preferredLocale: 'es',
  },
] as const;

export async function seedDev(db: SqliteDb): Promise<void> {
  // Guards a public deployment: these fixture accounts must never be
  // created in production (their passwordHash is null, so credential
  // login already fails — but don't even leave them in the DB).
  if (process.env.NODE_ENV === 'production') {
    // biome-ignore lint/suspicious/noConsoleLog: CLI seed script, console is the output
    console.log('[seed] NODE_ENV=production — skipping dev fixture users.');
    return;
  }
  for (const u of DEMO_USERS) {
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, u.email));
    if (existing.length === 0) {
      await db.insert(schema.users).values(u);
    }
  }
}

async function main(): Promise<void> {
  const db = getDb() as SqliteDb;
  await seedDev(db);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('❌ Dev seed failed:', err);
  process.exit(1);
});
