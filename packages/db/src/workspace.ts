import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Walk up from `start` until we find a directory containing
 * `apps/web/package.json`. That directory is the monorepo root.
 *
 * Falls back to `start` if no root is found, so the function never throws.
 */
export function findWorkspaceRoot(start: string): string {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, 'apps', 'web', 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}
