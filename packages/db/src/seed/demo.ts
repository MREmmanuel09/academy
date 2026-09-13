import type { SqliteDb } from '../client.js';
/**
 * Screenshot-ready demo seed. Builds on `seedDev` and adds a richer
 * fixture set. Implemented in a later phase (after Phase 5).
 */
import { seedDev } from './index.js';

export async function seedDemo(db: SqliteDb): Promise<void> {
  await seedDev(db);
  // TODO(phase-5): seed one course per type with progress for the demo user
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void (async () => {
    const { getDb } = await import('../client.js');
    const db = getDb() as SqliteDb;
    try {
      await seedDemo(db);
      process.exit(0);
    } catch (err) {
      console.error('❌ Demo seed failed:', err);
      process.exit(1);
    }
  })();
}
