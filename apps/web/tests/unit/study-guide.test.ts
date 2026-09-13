import { buildStudyGuide } from '@/lib/study-guide';
import { loadCourse, loadPath } from '@academy/content';
import { describe, expect, it } from 'vitest';

describe('buildStudyGuide', () => {
  it('renders the networking path with levels, objectives and exams', () => {
    const path = loadPath('networking-ccna');
    const course = loadCourse('networking');
    if (!path || !course) throw new Error('test setup: networking content missing');
    const md = buildStudyGuide(path, course);
    expect(md).toContain('# Networking Profesional (CCNA) — Study Guide');
    expect(md).toContain('Cisco CCNA 200-301');
    expect(md).toContain('## Level 1: Fundamentos de red');
    expect(md).toContain('- [ ] Describir la historia');
    expect(md).toContain('Exam: **exam-ccna** — pass with ≥75%.');
    expect(md).toContain('Milestone exam: **exam-ccna**');
    expect(md).toContain('Tick boxes as you complete each item.');
  });

  it('renders lessons with durations and labs', () => {
    const path = loadPath('devops-cloud');
    const course = loadCourse('devops');
    if (!path || !course) throw new Error('test setup: devops content missing');
    const md = buildStudyGuide(path, course);
    expect(md).toContain('### Linux (~');
    expect(md).toContain('Labs:');
    expect(md).toContain('Exam: **exam-linux** — pass with ≥70%.');
  });
});
