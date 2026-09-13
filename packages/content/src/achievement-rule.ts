/**
 * Re-declaration of the AchievementRule type from `apps/web/src/lib/achievements.ts`.
 *
 * We intentionally duplicate the type here (rather than importing it from
 * the web app) to keep `@academy/content` free of runtime dependencies on
 * the web layer. The shape is the same — both engines must agree on
 * what an achievement rule can be, so any change here must be mirrored
 * in `apps/web/src/lib/achievements.ts`.
 */
export type AchievementRule =
  | { kind: 'lesson_count'; count: number; track?: string }
  | { kind: 'streak'; days: number }
  | { kind: 'srs_state'; state: 'review' | 'learning'; count: number }
  | { kind: 'xp_threshold'; xp: number }
  | { kind: 'quiz_perfect'; count: number }
  | { kind: 'lab_completed'; count: number }
  | { kind: 'project_completed'; count: number }
  | { kind: 'vocab_count'; count: number }
  | { kind: 'english_episodes'; count: number }
  | { kind: 'all_of'; rules: AchievementRule[] };
