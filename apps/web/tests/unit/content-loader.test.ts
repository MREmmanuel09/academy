import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearCache, listCourses, loadCourse, setContentRoot } from '@academy/content';
import { beforeAll, describe, expect, it } from 'vitest';

let contentRoot: string;

beforeAll(() => {
  // Build a minimal content tree with one course, one unit, two
  // lessons, one lab, and one project.
  contentRoot = mkdtempSync(join(tmpdir(), 'academy-content-'));
  const courseDir = join(contentRoot, 'courses', 'devops', 'units', 'linux');
  const projectDir = join(contentRoot, 'courses', 'devops', 'projects');
  const lessonsDir = join(courseDir, 'lessons');
  const labsDir = join(courseDir, 'labs');
  mkdirSync(lessonsDir, { recursive: true });
  mkdirSync(labsDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });

  writeFileSync(
    join(lessonsDir, '01-shell.md'),
    `---
id: l-shell
slug: shell
title: Shell basics
difficulty: beginner
estimatedMinutes: 15
xp: 10
summary: Learn the shell.
---

# Shell basics

Some body.

## Subsection

More body.
`,
  );
  writeFileSync(
    join(lessonsDir, '02-vim.md'),
    `---
id: l-vim
slug: vim
title: Vim
difficulty: beginner
estimatedMinutes: 10
summary: Edit files fast.
---

# Vim

Text.
`,
  );
  writeFileSync(
    join(lessonsDir, 'l-shell.meta.json'),
    JSON.stringify({ keyTakeaways: ['use the shell'] }),
  );
  writeFileSync(
    join(labsDir, 'lab-shell.steps.json'),
    JSON.stringify({
      id: 'lab-shell',
      title: 'Lab',
      objective: 'Do shell stuff',
      steps: [{ instruction: 'open a terminal' }],
    }),
  );
  writeFileSync(
    join(projectDir, 'p-cicd.json'),
    JSON.stringify({
      id: 'p-cicd',
      title: 'CI/CD',
      scenario: 'Build a pipeline',
      goal: 'Ship to prod',
      deliverables: ['yaml file'],
      tech: ['github actions'],
    }),
  );

  setContentRoot(contentRoot);
});

describe('content loader', () => {
  it('lists the curated courses', () => {
    expect(listCourses().map((c) => c.slug)).toContain('devops');
  });

  it('loads a course with units, lessons, labs, projects', () => {
    const course = loadCourse('devops');
    expect(course).not.toBeNull();
    if (!course) return;
    expect(course.units.length).toBeGreaterThan(0);
    const unit = course.units[0];
    if (!unit) throw new Error('no unit');
    expect(unit.lessons.length).toBe(2);
    expect(unit.lessons[0]?.id).toBe('l-shell');
    expect(unit.lessons[0]?.title).toBe('Shell basics');
    expect(unit.lessons[0]?.estimatedMinutes).toBe(15);
    expect(unit.lessons[0]?.summary).toBe('Learn the shell.');
    expect(unit.labs.length).toBe(1);
    expect(unit.labs[0]?.title).toBe('Lab');
    expect(course?.projects.length).toBe(1);
  });

  it('parses Markdown body and strips frontmatter', () => {
    const course = loadCourse('devops');
    if (!course) throw new Error('no course');
    const lesson = course.units[0]?.lessons[0];
    if (!lesson) throw new Error('no lesson');
    expect(lesson.body).toContain('# Shell basics');
    expect(lesson.body).toContain('## Subsection');
    expect(lesson.body).not.toContain('id: l-shell');
  });

  it('returns null for a missing course', () => {
    clearCache();
    expect(loadCourse('does-not-exist')).toBeNull();
  });

  it('skips lessons that lack required frontmatter', () => {
    const other = join(contentRoot, 'courses', 'devops', 'units', 'linux', 'lessons', '99-bad.md');
    writeFileSync(
      other,
      `---
not: a lesson
---

# bad
`,
    );
    clearCache();
    const course = loadCourse('devops');
    if (!course) throw new Error('no course');
    // The bad file is skipped; the two good ones remain.
    const lessons = course.units.flatMap((u) => u.lessons);
    expect(lessons.find((l) => l.id === 'l-shell')).toBeDefined();
    expect(lessons.find((l) => l.slug === '99-bad')).toBeUndefined();
  });
});
