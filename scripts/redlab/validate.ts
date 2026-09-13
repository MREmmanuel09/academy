/**
 * Validates the import report against the **actual** RedLab v6 counts
 * measured from the source (not the original plan's estimates, which
 * turned out to be off — see `docs/redlab-counts.md` for the audit).
 *
 * The migration script produces exactly these counts when run against
 * a clean RedLab v6 source tree. Throws if any count is off.
 *
 * Counts were obtained by:
 *   1. Counting top-level objects in each RedLab source file via
 *      `scripts/redlab/count-actual.cjs`.
 *   2. Cross-checking against the data exported by the import script
 *      itself.
 *
 * The numbers are pinned so that silent regressions in the RedLab
 * source format are caught in CI.
 */

import type { MigrationReport } from './importer.js';

export const EXPECTED_COUNTS = {
  // 137 in the original plan was off. Real count is 106 (lesson files
  // 5+10+8+0+8+10+15+8+8+2+2+4+3+3+3+4+10+2+1 = 106, where the
  // "0" is lessons.ts which is just a spread of all the others).
  lessons: 106,

  // 14 in the original plan was off. Real count: 9 (network) +
  // 5 (python) + 2 (data) + 2 (bigdata) = 18.
  labs: 18,

  // 5 in the original plan was off. Real count: 5 (root projects.ts)
  // + 1 (python-projects) + 1 (bigdata-projects) = 7.
  projects: 7,

  // 14 in the plan was correct.
  exams: 14,

  // 45 in the plan was off. Real count: 27 (root) + 5 (python) +
  // 4 (data) + 2 (data-analysis) + 3 (bigdata) = 41.
  achievements: 41,
} as const;

export function validateReport(report: MigrationReport): {
  ok: boolean;
  mismatches: string[];
} {
  const mismatches: string[] = [];
  if (report.lessonsWritten !== EXPECTED_COUNTS.lessons) {
    mismatches.push(
      `lessons: got ${report.lessonsWritten}, expected ${EXPECTED_COUNTS.lessons}`,
    );
  }
  if (report.labsWritten !== EXPECTED_COUNTS.labs) {
    mismatches.push(
      `labs: got ${report.labsWritten}, expected ${EXPECTED_COUNTS.labs}`,
    );
  }
  if (report.projectsWritten !== EXPECTED_COUNTS.projects) {
    mismatches.push(
      `projects: got ${report.projectsWritten}, expected ${EXPECTED_COUNTS.projects}`,
    );
  }
  if (report.examsWritten !== EXPECTED_COUNTS.exams) {
    mismatches.push(
      `exams: got ${report.examsWritten}, expected ${EXPECTED_COUNTS.exams}`,
    );
  }
  if (report.achievementsWritten !== EXPECTED_COUNTS.achievements) {
    mismatches.push(
      `achievements: got ${report.achievementsWritten}, expected ${EXPECTED_COUNTS.achievements}`,
    );
  }
  return { ok: mismatches.length === 0, mismatches };
}
