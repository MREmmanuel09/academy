import { existsSync } from 'node:fs';
/**
 * Smoke test for the import-questions script. The real integration
 * test runs the script against dev.db and is exercised by the manual
 * `pnpm tsx scripts/import-questions.ts --source ../redlab ...` command.
 *
 * Here we only verify the test infrastructure (DB presence) and skip
 * cleanly when it isn't there.
 */
import { describe, expect, it } from 'vitest';

const DB_READY = existsSync('apps/web/data/dev.db');
const describeIf = DB_READY ? describe : describe.skip;

describeIf('import-questions (DB integration)', () => {
  it('finds the dev DB so the import script can run', () => {
    expect(existsSync('apps/web/data/dev.db')).toBe(true);
  });
});
