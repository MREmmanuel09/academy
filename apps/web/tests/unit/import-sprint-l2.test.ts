import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectSource, parseAny } from '../../src/lib/import';
import { parseSprintL2 } from '../../src/lib/import/sprint-l2';

const FIXTURE_PATH = resolve(__dirname, '..', 'fixtures', 'import', 'sprint-l2-sample.json');

describe('parseSprintL2 — fixture', () => {
  const result = parseSprintL2(readFileSync(FIXTURE_PATH, 'utf-8'));
  if (!result.ok) throw new Error(`fixture parse failed: ${result.message}`);

  it('parses the sample fixture', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical.source).toBe('sprint-l2');
    expect(result.canonical.sourceVersion).toBe(1);
  });

  it('maps profile preferred locale from l1', () => {
    if (!result.ok) return;
    expect(result.canonical.profile?.preferredLocale).toBe('es');
  });

  it('parses episodes as both activity events and srs_cards', () => {
    if (!result.ok) return;
    const episodeCards = result.canonical.srsCards.filter((c) => c.cardType === 'episode');
    expect(episodeCards.length).toBe(10);
    const bookmarks = result.canonical.activity.filter((a) => a.kind === 'bookmark');
    expect(bookmarks.length).toBe(10);
  });

  it('parses user cards as srs_cards (cardType=vocab)', () => {
    if (!result.ok) return;
    const vocabCards = result.canonical.srsCards.filter((c) => c.cardType === 'vocab');
    expect(vocabCards.length).toBe(4);
    for (const c of vocabCards) {
      expect(c.source).toBe('sprint-l2-fsrs');
      expect(c.originalState).not.toBeNull();
    }
  });

  it('parses roleplay sessions as activity', () => {
    if (!result.ok) return;
    const roleplays = result.canonical.activity.filter((a) => a.kind === 'roleplay_session');
    expect(roleplays.length).toBe(2);
  });

  it('parses learning events as activity', () => {
    if (!result.ok) return;
    const events = result.canonical.activity.filter((a) => a.kind === 'sprint_l2_event');
    expect(events.length).toBe(4);
  });

  it('sets lastActiveDate to the most recent of vlt/cefr dates', () => {
    if (!result.ok) return;
    expect(result.canonical.lastActiveDate).toBe('2026-08-19');
  });

  it('creates an exam attempt for the CEFR test', () => {
    if (!result.ok) return;
    const examAttempts = result.canonical.attempts.filter((a) => a.kind === 'exam');
    expect(examAttempts.length).toBe(1);
    const cefr = examAttempts[0];
    expect(cefr?.quizId).toBe('sprint-l2:cefr');
    // Avg of 3.5, 3.0, 2.5, 2.5 = 2.875 → 2.875/6 ≈ 0.48
    expect(cefr?.score).toBeGreaterThan(0.45);
    expect(cefr?.score).toBeLessThan(0.5);
  });

  it('does not synthesise achievements', () => {
    if (!result.ok) return;
    expect(result.canonical.earnedAchievementIds).toEqual([]);
  });
});

describe('parseSprintL2 — error paths', () => {
  it('rejects missing source field', () => {
    const r = parseSprintL2({ schemaVersion: 1, user: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('missing_field');
  });

  it('rejects wrong source', () => {
    const r = parseSprintL2({ source: 'redlab', schemaVersion: 1, user: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('missing_field');
  });

  it('rejects missing schemaVersion', () => {
    const r = parseSprintL2({ source: 'sprint-l2', user: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('unsupported_version');
  });

  it('rejects invalid JSON string', () => {
    const r = parseSprintL2('not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid_json');
  });

  it('rejects non-object', () => {
    const r = parseSprintL2(42);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('wrong_shape');
  });

  it('handles empty/minimal input gracefully', () => {
    const r = parseSprintL2({
      source: 'sprint-l2',
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      user: { l1: 'es' },
      progress: {},
      userCards: [],
      roleplaySessions: [],
      learningEvents: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.canonical.completedLessonIds).toEqual([]);
    expect(r.canonical.srsCards).toEqual([]);
  });

  it('decodes episodesCompleted JSON string', () => {
    const r = parseSprintL2({
      source: 'sprint-l2',
      schemaVersion: 1,
      user: { l1: 'en' },
      progress: { episodesCompleted: '["ep-1","ep-2"]' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.canonical.srsCards.filter((c) => c.cardType === 'episode').length).toBe(2);
  });

  it('caps learning events at 200', () => {
    const events = Array.from({ length: 250 }, () => ({
      type: 'vocab_review',
      timestamp: '2026-01-01T00:00:00.000Z',
    }));
    const r = parseSprintL2({
      source: 'sprint-l2',
      schemaVersion: 1,
      user: { l1: 'en' },
      learningEvents: events,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ev = r.canonical.activity.filter((a) => a.kind === 'sprint_l2_event');
    expect(ev.length).toBe(200);
    expect(r.warnings.some((w) => w.includes('truncated'))).toBe(true);
  });
});

describe('parseAny — Sprint L2', () => {
  it('detects Sprint L2 from the sample fixture', () => {
    const src = readFileSync(FIXTURE_PATH, 'utf-8');
    expect(detectSource(src)).toBe('sprint-l2');
  });

  it('parses Sprint L2 via parseAny', () => {
    const src = readFileSync(FIXTURE_PATH, 'utf-8');
    const r = parseAny(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.canonical.source).toBe('sprint-l2');
  });
});
