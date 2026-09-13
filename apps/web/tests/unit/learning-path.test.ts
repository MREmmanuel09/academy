import {
  type LearningPath,
  getPathForCourse,
  listPaths,
  loadPath,
  validatePath,
} from '@academy/content';
import { describe, expect, it } from 'vitest';

/** Minimal single-unit path scaffold for negative tests (networking). */
function basePath(): LearningPath {
  return {
    id: 'test-path',
    course: 'networking',
    title: 'Test',
    description: 'Test path',
    externalExam: 'Test',
    levels: [
      {
        id: 'l1',
        title: 'L1',
        description: 'd',
        units: [
          { unit: 'fundamentos', objectives: ['obj'], exams: [] },
          { unit: 'capa-red', objectives: ['obj'], exams: [] },
          { unit: 'capa-transporte', objectives: ['obj'], exams: [] },
          { unit: 'capa-aplicacion', objectives: ['obj'], exams: [] },
          { unit: 'switching-routing', objectives: ['obj'], exams: [] },
          { unit: 'wireless', objectives: ['obj'], exams: [] },
          { unit: 'seguridad', objectives: ['obj'], exams: [] },
          { unit: 'herramientas', objectives: ['obj'], exams: [] },
        ],
      },
    ],
  };
}

/** Test helpers with loud setup failures (no non-null assertions). */
function pathLevel(p: LearningPath) {
  const level = p.levels[0];
  if (!level) throw new Error('test setup: missing level 0');
  return level;
}

function pathUnit(p: LearningPath, i: number) {
  const unit = pathLevel(p).units[i];
  if (!unit) throw new Error(`test setup: missing unit ${i}`);
  return unit;
}

describe('learning paths', () => {
  it('lists both flagship paths', () => {
    const ids = listPaths();
    expect(ids).toContain('networking-ccna');
    expect(ids).toContain('devops-cloud');
  });

  it('resolves paths by course', () => {
    expect(getPathForCourse('networking')?.id).toBe('networking-ccna');
    expect(getPathForCourse('devops')?.id).toBe('devops-cloud');
    expect(getPathForCourse('nope')).toBeNull();
    expect(loadPath('nope')).toBeNull();
  });

  it('validates the real networking path with no errors', () => {
    const path = loadPath('networking-ccna');
    expect(path).not.toBeNull();
    if (!path) throw new Error('test setup: networking-ccna missing');
    expect(validatePath(path)).toEqual([]);
  });

  it('validates the real devops path with no errors', () => {
    const path = loadPath('devops-cloud');
    expect(path).not.toBeNull();
    if (!path) throw new Error('test setup: devops-cloud missing');
    expect(validatePath(path)).toEqual([]);
  });

  it('rejects unknown courses', () => {
    const p = basePath();
    p.course = 'nope';
    expect(validatePath(p).join(' ')).toMatch(/unknown course/);
  });

  it('rejects unknown units', () => {
    const p = basePath();
    pathUnit(p, 0).unit = 'nope';
    expect(validatePath(p).join(' ')).toMatch(/unknown unit/);
  });

  it('rejects duplicate units', () => {
    const p = basePath();
    pathUnit(p, 1).unit = 'fundamentos';
    expect(validatePath(p).join(' ')).toMatch(/twice/);
  });

  it('rejects uncovered course units', () => {
    const p = basePath();
    const level = pathLevel(p);
    level.units = level.units.slice(0, 3);
    expect(validatePath(p).join(' ')).toMatch(/not covered/);
  });

  it('rejects units without objectives', () => {
    const p = basePath();
    pathUnit(p, 0).objectives = [];
    expect(validatePath(p).join(' ')).toMatch(/no objectives/);
  });

  it('rejects unknown exams', () => {
    const p = basePath();
    pathUnit(p, 0).exams = [{ id: 'exam-nope' }];
    expect(validatePath(p).join(' ')).toMatch(/unknown exam/);
  });

  it('rejects exam prerequisites not passed earlier in the path', () => {
    // exam-ccna requires exam-basic; scheduling ccna first must fail.
    const p = basePath();
    pathUnit(p, 4).exams = [{ id: 'exam-ccna' }];
    expect(validatePath(p).join(' ')).toMatch(/requires 'exam-basic'/);
  });

  it('rejects exams from another course', () => {
    const p = basePath();
    pathUnit(p, 0).exams = [{ id: 'exam-linux' }];
    expect(validatePath(p).join(' ')).toMatch(/belongs to course/);
  });

  it('rejects empty levels', () => {
    const p = basePath();
    p.levels = [{ id: 'empty', title: 'E', description: 'd', units: [] }];
    const errors = validatePath(p).join(' ');
    expect(errors).toMatch(/no units/);
  });
});
