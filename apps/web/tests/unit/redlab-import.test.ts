import { describe, expect, it } from 'vitest';
import { parseObject } from '../../../../scripts/redlab/fields.js';
import { COURSES, MODULE_MAPPING } from '../../../../scripts/redlab/mapper.js';
import { findTopLevelArray, splitTopLevelObjects } from '../../../../scripts/redlab/parser.js';

describe('redlab parser — findTopLevelArray', () => {
  it('finds a simple top-level array', () => {
    const src = `
      export const things: T[] = [
        { id: 'a' },
        { id: 'b' },
      ];
    `;
    const body = findTopLevelArray(src, 'things');
    expect(body).not.toBeNull();
    expect(body).toContain('a');
    expect(body).toContain('b');
  });

  it('returns null when the export is missing', () => {
    const body = findTopLevelArray('const x = 1;', 'things');
    expect(body).toBeNull();
  });

  it('handles nested brackets correctly', () => {
    const src = `
      export const items = [
        { id: 'a', nested: { x: [1, 2, 3] } },
        { id: 'b', nested: { x: [4, [5, 6]] } },
      ];
    `;
    const body = findTopLevelArray(src, 'items');
    expect(body).not.toBeNull();
    if (body === null) return;
    const objs = splitTopLevelObjects(body);
    expect(objs).toHaveLength(2);
  });

  it('skips string content with brackets', () => {
    const src = `
      export const items = [
        { id: 'a', body: 'hello [world]' },
      ];
    `;
    const body = findTopLevelArray(src, 'items');
    expect(body).not.toBeNull();
    if (body === null) return;
    const objs = splitTopLevelObjects(body);
    expect(objs).toHaveLength(1);
  });

  it('handles template literals with ${...}', () => {
    const src = `
      export const items = [
        { id: 'a', body: \`hello \${name}\` },
      ];
    `;
    const body = findTopLevelArray(src, 'items');
    expect(body).not.toBeNull();
  });
});

describe('redlab parser — splitTopLevelObjects', () => {
  it('splits comma-separated objects', () => {
    const body = `{ id: 'a' }, { id: 'b' }, { id: 'c' }`;
    const objs = splitTopLevelObjects(body);
    expect(objs).toHaveLength(3);
  });

  it('keeps nested objects together', () => {
    const body = `{ id: 'a', meta: { x: 1, y: 2 } }, { id: 'b' }`;
    const objs = splitTopLevelObjects(body);
    expect(objs).toHaveLength(2);
  });
});

describe('redlab parser — parseObject', () => {
  it('extracts string and number fields', () => {
    const obj = `{ id: 'abc', title: 'Hi', count: 42, ok: true }`;
    const r = parseObject(obj, ['id', 'title', 'count', 'ok']);
    expect(r.id).toBe('abc');
    expect(r.title).toBe('Hi');
    expect(r.count).toBe(42);
    expect(r.ok).toBe(true);
  });

  it('extracts template literal strings', () => {
    const obj = '{ body: `hello world` }';
    const r = parseObject(obj, ['body']);
    expect(r.body).toBe('hello world');
  });

  it('extracts string arrays', () => {
    const obj = '{ tags: ["a", "b", "c"] }';
    const r = parseObject(obj, ['tags']);
    expect(r.tags).toEqual(['a', 'b', 'c']);
  });

  it('extracts number arrays', () => {
    const obj = '{ xs: [1, 2, 3] }';
    const r = parseObject(obj, ['xs']);
    expect(r.xs).toEqual([1, 2, 3]);
  });

  it('extracts nested object literals', () => {
    const obj = '{ meta: { a: 1, b: "x" } }';
    const r = parseObject(obj, ['meta']);
    expect(r.meta).toEqual({ a: 1, b: 'x' });
  });

  it('marks function values as opaque', () => {
    const obj = '{ check: (s) => s.x > 0, name: "thing" }';
    const r = parseObject(obj, ['check', 'name']);
    expect(r.name).toBe('thing');
    const check = r.check as { __opaque: string };
    expect(check.__opaque).toContain('s.x > 0');
  });
});

describe('redlab mapper', () => {
  it('maps every RedLab module to at least one Academy course+unit', () => {
    const modules = Object.keys(MODULE_MAPPING) as Array<keyof typeof MODULE_MAPPING>;
    expect(modules.length).toBeGreaterThanOrEqual(16);
    for (const m of modules) {
      const list = MODULE_MAPPING[m];
      expect(list.length).toBeGreaterThan(0);
      for (const entry of list) {
        expect(entry.course).toMatch(/^[a-z]+$/);
        expect(entry.unit).toMatch(/^[a-z-]+$/);
      }
    }
  });

  it('defines the 5 documented courses', () => {
    const slugs = COURSES.map((c) => c.slug);
    expect(slugs).toContain('networking');
    expect(slugs).toContain('devops');
    expect(slugs).toContain('python');
    expect(slugs).toContain('data');
    expect(slugs).toContain('bigdata');
  });
});

describe('redlab parser — readSource on actual files', () => {
  // Smoke test: parse a tiny fixture that mimics RedLab's structure.
  // We don't depend on the RedLab source being present in the test
  // environment; instead, we synthesise a small in-memory TS file and
  // round-trip it through `readSource` + `findTopLevelArray` + parser.
  it('parses a synthesised RedLab-style array', () => {
    const src = `
      // Some comment
      export const lessons: Lesson[] = [
        {
          id: 'f-osi',
          module: 'fundamentos',
          title: 'OSI',
          summary: 'Reference model',
          difficulty: 'principiante',
          estimatedMinutes: 12,
          xp: 50,
          sections: [
            { heading: 'Intro', content: 'Body' },
          ],
          keyTakeaways: ['one', 'two'],
        },
        {
          id: 'f-tcpip',
          module: 'fundamentos',
          title: 'TCP/IP',
          summary: 'Practical model',
          difficulty: 'principiante',
          estimatedMinutes: 10,
          xp: 50,
          sections: [],
          keyTakeaways: [],
        },
      ];
    `;
    const body = findTopLevelArray(src, 'lessons');
    expect(body).not.toBeNull();
    if (body === null) return;
    const objs = splitTopLevelObjects(body);
    expect(objs).toHaveLength(2);
    const firstObj = objs[0];
    expect(firstObj).toBeDefined();
    if (firstObj === undefined) return;
    const first = parseObject(firstObj, ['id', 'module', 'title', 'xp', 'keyTakeaways']);
    expect(first.id).toBe('f-osi');
    expect(first.module).toBe('fundamentos');
    expect(first.xp).toBe(50);
    expect(first.keyTakeaways).toEqual(['one', 'two']);
  });
});
