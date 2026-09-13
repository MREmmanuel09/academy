import { PLACEHOLDER_COURSES } from '@academy/content';
import { describe, expect, it } from 'vitest';

describe('@academy/content placeholder fixtures', () => {
  it('ships at least one placeholder course', () => {
    expect(PLACEHOLDER_COURSES.length).toBeGreaterThan(0);
  });

  it('placeholder courses have valid slugs', () => {
    for (const c of PLACEHOLDER_COURSES) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(['devops', 'data', 'english', 'networking', 'cloud']).toContain(c.track);
      expect(['beginner', 'intermediate', 'advanced']).toContain(c.difficulty);
    }
  });
});
