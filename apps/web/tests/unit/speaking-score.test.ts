import { levenshteinWords, normalizeSpeech, speechScore } from '@/lib/speaking-score';
import { describe, expect, it } from 'vitest';

describe('normalizeSpeech', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeSpeech('Hi! Can I have a flat white, please?')).toEqual([
      'hi',
      'can',
      'i',
      'have',
      'a',
      'flat',
      'white',
      'please',
    ]);
  });

  it('handles empty input', () => {
    expect(normalizeSpeech('')).toEqual([]);
    expect(normalizeSpeech('... !!!')).toEqual([]);
  });
});

describe('levenshteinWords', () => {
  it('is zero for identical sequences', () => {
    expect(levenshteinWords(['a', 'b'], ['a', 'b'])).toBe(0);
  });

  it('counts substitutions, insertions, deletions', () => {
    expect(levenshteinWords(['a'], ['b'])).toBe(1);
    expect(levenshteinWords(['a', 'b'], ['a'])).toBe(1);
    expect(levenshteinWords(['a'], ['a', 'b'])).toBe(1);
  });
});

describe('speechScore', () => {
  it('scores exact matches as 1', () => {
    expect(speechScore('Hello world', 'hello world').accuracy).toBe(1);
  });

  it('ignores case and punctuation', () => {
    expect(speechScore('Hi! Can I have one?', 'hi can i have one').accuracy).toBe(1);
  });

  it('scores empty transcripts as 0', () => {
    expect(speechScore('Hello world', '').accuracy).toBe(0);
  });

  it('scores partial matches proportionally', () => {
    const { accuracy, matched, total } = speechScore('one two three four', 'one two three');
    expect(total).toBe(4);
    expect(matched).toBe(3);
    expect(accuracy).toBeCloseTo(0.75);
  });

  it('penalizes wrong words', () => {
    const s = speechScore('i love apples', 'i hate apples');
    expect(s.accuracy).toBeCloseTo(2 / 3);
  });
});
