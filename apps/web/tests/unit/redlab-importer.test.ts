import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { importRedlab } from '../../../../scripts/redlab/importer.js';
import { EXPECTED_COUNTS, validateReport } from '../../../../scripts/redlab/validate.js';

let sourceDir: string;
let targetDir: string;

/**
 * Build a minimal RedLab-shaped source tree under `root`. We don't try
 * to faithfully reproduce the whole of v6 — that's what the real
 * import does. We just create enough files to exercise the parser.
 */
function buildFixture(root: string): void {
  const data = join(root, 'src', 'data');
  mkdirSync(join(data, 'devops'), { recursive: true });

  // Lessons aggregator (3 lessons across 2 modules).
  writeFileSync(
    join(data, 'lessons.ts'),
    `export const lessons: Lesson[] = [
      { id: 'l1', module: 'fundamentos', title: 'L1', summary: 's', difficulty: 'principiante', estimatedMinutes: 5, xp: 10, sections: [{ heading: 'h', content: 'c' }], keyTakeaways: ['a'] },
      { id: 'l2', module: 'devops', title: 'L2', summary: 's', difficulty: 'intermedio', estimatedMinutes: 8, xp: 20, sections: [], keyTakeaways: [] },
      { id: 'l3', module: 'bigdata', title: 'L3', summary: 's', difficulty: 'avanzado', estimatedMinutes: 15, xp: 30, sections: [], keyTakeaways: [] },
    ];`,
  );

  // Labs.
  writeFileSync(
    join(data, 'labs.ts'),
    `export const labs: Lab[] = [
      { id: 'lab1', title: 'Lab 1', module: 'fundamentos', difficulty: 'facil', estimatedMinutes: 30, xp: 50, objective: 'o', topology: { devices: [], links: [] }, steps: [{ instruction: 'do it' }] },
    ];`,
  );

  // Projects.
  writeFileSync(
    join(data, 'projects.ts'),
    `export const projects: Project[] = [
      { id: 'p1', title: 'P1', difficulty: 'junior', duration: '1 week', xp: 100, scenario: 's', goal: 'g', deliverables: ['d1'], tech: ['docker'] },
    ];`,
  );

  // Exams (one is enough for the parser test).
  writeFileSync(
    join(data, 'exams.ts'),
    `export const examNetworksBasic: Exam = {
      id: 'exam-basic',
      title: 'T',
      description: 'd',
      level: 'fundamentos',
      totalQuestions: 5,
      durationMinutes: 10,
      passingScore: 70,
      xp: 100,
      badge: { name: 'X', icon: '🥉' },
      questionIds: ['q-1'],
      prerequisites: [],
    };`,
  );

  // Achievements.
  writeFileSync(
    join(data, 'achievements.ts'),
    `export const achievements: Achievement[] = [
      { id: 'a1', name: 'A1', description: 'd', icon: 'A', category: 'progress', rarity: 'common', xpBonus: 50, check: (s) => s.progress.completedLessons.length >= 1 },
      { id: 'a2', name: 'A2', description: 'd', icon: 'A', category: 'streak', rarity: 'common', xpBonus: 30, check: (s) => s.progress.streak >= 3 },
    ];`,
  );
}

beforeAll(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'redlab-src-'));
  targetDir = mkdtempSync(join(tmpdir(), 'redlab-out-'));
  buildFixture(sourceDir);
});

afterAll(() => {
  rmSync(sourceDir, { recursive: true, force: true });
  rmSync(targetDir, { recursive: true, force: true });
});

describe('importRedlab — fixture-based', () => {
  it('parses the fixture into the documented counts', () => {
    const report = importRedlab({ source: sourceDir, target: targetDir, dryRun: true });
    // 3 lessons, 1 lab, 1 project, 1 exam, 2 achievements.
    expect(report.lessonsWritten).toBe(3);
    expect(report.labsWritten).toBe(1);
    expect(report.projectsWritten).toBe(1);
    expect(report.examsWritten).toBe(1);
    expect(report.achievementsWritten).toBe(2);
  });

  it('writes the expected directory layout on real import', () => {
    const report = importRedlab({ source: sourceDir, target: targetDir, dryRun: false });
    expect(report.lessonsWritten).toBe(3);

    // Lesson files exist.
    expect(
      existsSync(
        join(targetDir, 'courses', 'networking', 'units', 'fundamentos', 'lessons', 'l1.md'),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(targetDir, 'courses', 'networking', 'units', 'fundamentos', 'lessons', 'l1.meta.json'),
      ),
    ).toBe(true);
    expect(
      existsSync(join(targetDir, 'courses', 'devops', 'units', 'docker', 'lessons', 'l2.md')),
    ).toBe(true);
    expect(
      existsSync(join(targetDir, 'courses', 'bigdata', 'units', 'bigdata', 'lessons', 'l3.md')),
    ).toBe(true);

    // Lab files.
    expect(
      existsSync(
        join(targetDir, 'courses', 'networking', 'units', 'fundamentos', 'labs', 'lab1.md'),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(targetDir, 'courses', 'networking', 'units', 'fundamentos', 'labs', 'lab1.steps.json'),
      ),
    ).toBe(true);

    // Project.
    expect(existsSync(join(targetDir, 'courses', 'devops', 'projects', 'p1.md'))).toBe(true);

    // Course skeleton.
    expect(existsSync(join(targetDir, 'courses', 'networking', 'course.json'))).toBe(true);

    // Achievements.
    expect(existsSync(join(targetDir, 'achievements', 'networking.json'))).toBe(true);
    const ach = JSON.parse(
      readFileSync(join(targetDir, 'achievements', 'networking.json'), 'utf8'),
    );
    expect(ach).toHaveLength(2);
    expect(ach[0]).toMatchObject({ id: 'a1', rule: { kind: 'lesson_count', count: 1 } });
    expect(ach[1]).toMatchObject({ id: 'a2', rule: { kind: 'streak', days: 3 } });
  });

  it('is idempotent — running twice does not duplicate achievements', () => {
    const before = JSON.parse(
      readFileSync(join(targetDir, 'achievements', 'networking.json'), 'utf8'),
    );
    importRedlab({ source: sourceDir, target: targetDir, dryRun: false });
    const after = JSON.parse(
      readFileSync(join(targetDir, 'achievements', 'networking.json'), 'utf8'),
    );
    expect(after).toHaveLength(before.length);
  });
});

describe('validateReport — expected counts', () => {
  it('exports the actual RedLab v6 counts (audited)', () => {
    expect(EXPECTED_COUNTS.lessons).toBe(106);
    expect(EXPECTED_COUNTS.labs).toBe(18);
    expect(EXPECTED_COUNTS.projects).toBe(7);
    expect(EXPECTED_COUNTS.exams).toBe(14);
    expect(EXPECTED_COUNTS.achievements).toBe(41);
  });

  it('passes when counts match', () => {
    const r = validateReport({
      lessonsWritten: 106,
      labsWritten: 18,
      projectsWritten: 7,
      examsWritten: 14,
      achievementsWritten: 41,
      perCourse: {},
      warnings: [],
    });
    expect(r.ok).toBe(true);
    expect(r.mismatches).toEqual([]);
  });

  it('reports mismatches with the exact delta', () => {
    const r = validateReport({
      lessonsWritten: 100,
      labsWritten: 18,
      projectsWritten: 7,
      examsWritten: 14,
      achievementsWritten: 41,
      perCourse: {},
      warnings: [],
    });
    expect(r.ok).toBe(false);
    expect(r.mismatches[0]).toContain('lessons: got 100, expected 106');
  });

  it('integration: importing the real RedLab v6 source hits the expected counts', () => {
    // The RedLab source is expected to be checked out at ../redlab
    // relative to the monorepo root.
    const realSource = resolve(__dirname, '..', '..', '..', '..', '..', 'redlab');
    if (!existsSync(realSource)) {
      // Skip if the source is not available in this CI environment.
      return;
    }
    const realTarget = mkdtempSync(join(tmpdir(), 'redlab-real-'));
    try {
      const report = importRedlab({ source: realSource, target: realTarget });
      const validation = validateReport(report);
      expect(
        validation.mismatches,
        `Migration mismatches:\n  ${validation.mismatches.join('\n  ')}`,
      ).toEqual([]);
    } finally {
      rmSync(realTarget, { recursive: true, force: true });
    }
  });
});
