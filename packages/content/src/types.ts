/**
 * Content type contracts. Concrete courses/lessons will be added in Phase 3-4
 * via the migration scripts. This file defines the shape so packages can be
 * safely imported without depending on real content.
 */

export type CourseTrack = 'devops' | 'data' | 'english' | 'networking' | 'cloud';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface CourseSummary {
  slug: string;
  track: CourseTrack;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  lessonCount: number;
}

export interface LessonSummary {
  slug: string;
  courseSlug: string;
  unitSlug: string;
  title: string;
  estimatedMinutes: number;
}

export const PLACEHOLDER_COURSES: readonly CourseSummary[] = [
  {
    slug: 'devops-fundamentals',
    track: 'devops',
    title: 'DevOps Fundamentals',
    description: 'Linux, Git, containers, CI/CD and cloud basics.',
    difficulty: 'beginner',
    estimatedHours: 40,
    lessonCount: 0,
  },
] as const;
