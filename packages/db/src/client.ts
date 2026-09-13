import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { type BetterSQLite3Database, drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { type PostgresJsDatabase, drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { findWorkspaceRoot } from './workspace.js';

export type SqliteDb = BetterSQLite3Database<typeof schema>;
export type PostgresDb = PostgresJsDatabase<typeof schema>;
export type Db = SqliteDb | PostgresDb;

let _db: Db | null = null;

/**
 * Resolve a SQLite file URL (`file:./path`) to an absolute path.
 * - If absolute, return as-is.
 * - Otherwise, resolve relative to the workspace root (where the
 *   monorepo's `package.json` lives). This means the dev DB always lives
 *   at `<workspace>/apps/web/data/dev.db` regardless of which package
 *   triggers the connection.
 */
function resolveSqlitePath(raw: string): string {
  if (isAbsolute(raw)) return raw;
  const root = findWorkspaceRoot(process.cwd());
  return resolve(root, raw);
}

/**
 * Get or create the database connection singleton.
 *
 * - `file:./...` → SQLite via better-sqlite3 (dev default)
 * - `postgres://...` or `postgresql://...` → PostgreSQL via postgres-js
 *
 * SQLite files are created on demand; parent directory is ensured.
 */
export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL ?? 'file:./apps/web/data/dev.db';
  if (url.startsWith('file:')) {
    const path = resolveSqlitePath(url.replace(/^file:/, ''));
    mkdirSync(dirname(path), { recursive: true });
    const sqlite = new Database(path);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    // Wait (instead of throwing SQLITE_BUSY) when a concurrent connection
    // holds the write lock. better-sqlite3 defaults to a 0ms timeout, so
    // parallel requests (or parallel E2E workers) would fail immediately
    // on any write-write collision.
    sqlite.pragma('busy_timeout = 5000');
    _db = drizzleSqlite(sqlite, { schema }) as SqliteDb;
    return _db;
  }
  const client = postgres(url, { prepare: false });
  _db = drizzlePostgres(client, { schema }) as PostgresDb;
  return _db;
}

export { schema };
