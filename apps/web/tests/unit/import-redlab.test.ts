import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectSource, parseAny } from '../../src/lib/import';
import { parseRedlabV6 } from '../../src/lib/import/redlab';

const FIXTURE_PATH = resolve(__dirname, '..', 'fixtures', 'import', 'redlab-v6-sample.json');

describe('parseRedlabV6 — fixture', () => {
  const result = parseRedlabV6(readFileSync(FIXTURE_PATH, 'utf-8'));
  if (!result.ok) throw new Error(`fixture parse failed: ${result.message}`);

  it('parses the sample fixture successfully', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical.source).toBe('redlab-v6');
    expect(result.canonical.sourceVersion).toBe(6);
  });

  it('maps completed lessons', () => {
    if (!result.ok) return;
    expect(result.canonical.completedLessonIds).toContain('l-1');
    expect(result.canonical.completedLessonIds).toContain('dk-1');
    expect(result.canonical.completedLessonIds.length).toBe(10);
  });

  it('maps completed labs', () => {
    if (!result.ok) return;
    expect(result.canonical.completedLabIds).toEqual(['lab-docker', 'lab-cicd']);
  });

  it('maps quiz scores to attempts', () => {
    if (!result.ok) return;
    const quizAttempts = result.canonical.attempts.filter((a) => a.kind === 'quiz');
    expect(quizAttempts.length).toBe(3);
    expect(quizAttempts[0]?.passed).toBe(true);
  });

  it('maps exam attempts with kind=exam', () => {
    if (!result.ok) return;
    const examAttempts = result.canonical.attempts.filter((a) => a.kind === 'exam');
    expect(examAttempts.length).toBe(2);
    const linux = examAttempts.find((a) => a.quizId === 'exam-linux-basics');
    expect(linux?.passed).toBe(true);
  });

  it('reads XP and streak', () => {
    if (!result.ok) return;
    expect(result.canonical.totalXp).toBe(1240);
    expect(result.canonical.currentStreak).toBe(7);
    expect(result.canonical.lastActiveDate).toBe('2026-08-15');
  });

  it('maps achievement and badge IDs', () => {
    if (!result.ok) return;
    expect(result.canonical.earnedAchievementIds).toContain('first-step');
    expect(result.canonical.earnedBadgeIds).toContain('badge-linux-fundamentals');
  });

  it('parses SRS reviews as lesson cards with source=redlab-sm2', () => {
    if (!result.ok) return;
    expect(result.canonical.srsCards.length).toBe(4);
    for (const c of result.canonical.srsCards) {
      expect(c.cardType).toBe('lesson');
      expect(c.source).toBe('redlab-sm2');
    }
  });

  it('records bookmarks as activity events', () => {
    if (!result.ok) return;
    const bookmarks = result.canonical.activity.filter((a) => a.kind === 'bookmark');
    expect(bookmarks.length).toBe(3);
  });

  it('records diagnostic result as activity', () => {
    if (!result.ok) return;
    const diag = result.canonical.activity.find((a) => a.kind === 'diagnostic');
    expect(diag).toBeDefined();
    expect((diag?.payload as { level?: string }).level).toBe('mid');
  });

  it('records interactive exercises as activity', () => {
    if (!result.ok) return;
    const ix = result.canonical.activity.filter((a) => a.kind === 'interactive_exercise');
    expect(ix.length).toBe(3);
  });
});

describe('parseRedlabV6 — error paths', () => {
  it('rejects non-object input', () => {
    // Pass a JSON-encoded string — it parses to a string, which is
    // not a valid RedLab object.
    const r = parseRedlabV6(JSON.stringify('hello'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('wrong_shape');
  });

  it('rejects array input', () => {
    const r = parseRedlabV6(JSON.stringify([1, 2, 3]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('wrong_shape');
  });

  it('rejects missing version', () => {
    const r = parseRedlabV6({ progress: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('missing_field');
  });

  it('rejects unsupported version', () => {
    const r = parseRedlabV6({ version: 99, progress: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('unsupported_version');
  });

  it('rejects missing progress', () => {
    const r = parseRedlabV6({ version: 6 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('missing_field');
  });

  it('rejects invalid JSON string', () => {
    const r = parseRedlabV6('{not valid json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid_json');
  });

  it('rejects oversized string input', () => {
    const huge = 'x'.repeat(6 * 1024 * 1024);
    const r = parseRedlabV6(huge);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too_large');
  });

  it('rejects oversized JSON-string input', () => {
    // 6MB of valid JSON-encoded array.
    const huge = `[${'1,'.repeat(3 * 1024 * 1024)}1]`;
    const r = parseRedlabV6(huge);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too_large');
  });

  it('handles empty arrays gracefully', () => {
    const r = parseRedlabV6({
      version: 6,
      exportedAt: '2026-01-01T00:00:00.000Z',
      progress: {
        completedLessons: [],
        completedLabs: [],
        quizScores: {},
        xp: 0,
        streak: 0,
        lastActive: '',
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.canonical.completedLessonIds).toEqual([]);
    expect(r.canonical.totalXp).toBe(0);
    expect(r.canonical.lastActiveDate).toBeNull();
  });

  it('warns on malformed quiz scores', () => {
    const r = parseRedlabV6({
      version: 6,
      progress: {
        completedLessons: [],
        completedLabs: [],
        quizScores: { broken: { score: 'oops', total: 0 } },
        xp: 0,
        streak: 0,
        lastActive: '',
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.canonical.attempts.length).toBe(0);
  });
});

describe('parseAny — dispatch', () => {
  it('detects RedLab v6 from the sample fixture', () => {
    const src = readFileSync(FIXTURE_PATH, 'utf-8');
    expect(detectSource(src)).toBe('redlab-v6');
  });

  it('parses RedLab v6 via parseAny', () => {
    const src = readFileSync(FIXTURE_PATH, 'utf-8');
    const r = parseAny(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.canonical.source).toBe('redlab-v6');
  });

  it('returns null for unrecognised input', () => {
    expect(detectSource({ random: 'shape' })).toBe(null);
  });
});
