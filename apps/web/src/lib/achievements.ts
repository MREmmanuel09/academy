/**
 * Declarative achievement engine.
 *
 * Each row in the `achievements` table has a `rule` JSON. The engine
 * evaluates rules against a `UserContext` snapshot and returns the
 * list of achievements that should be unlocked.
 *
 * ## Rule schema (versioned, additive)
 *
 *   {
 *     "kind": "lesson_count" | "streak" | "srs_state" | "xp_threshold"
 *           | "quiz_perfect" | "lab_completed" | "project_completed"
 *           | "vocab_count" | "english_episodes" | "all_of",
 *     ... kind-specific fields
 *   }
 *
 * `all_of` is a meta-kind that ANDs multiple sub-rules together.
 *
 * ## Determinism
 *
 * Given the same context and rule set, the engine always returns the
 * same set. This is what lets us safely re-evaluate on every event
 * without worrying about duplicate unlocks (the DB has a unique
 * constraint on `(user_id, achievement_id)`).
 *
 * ## Adding new rule kinds
 *
 * 1. Add the discriminator to `AchievementRule['kind']`.
 * 2. Add a handler in the dispatch table at the bottom of this file.
 * 3. Add a test case.
 * 4. Document the rule in the README.
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

export interface AchievementDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  /** Optional metadata that the RedLab achievements carry but the
   *  engine defaults don't. We keep them as optional so older engine
   *  defaults don't need to be retro-fitted. */
  category?: string;
  rarity?: string;
  rule: AchievementRule;
}

/** User state snapshot used to evaluate achievement rules. */
export interface AchievementContext {
  lessonsCompleted: number;
  lessonsCompletedByTrack: Record<string, number>;
  labsCompleted: number;
  projectsCompleted: number;
  quizzesPerfect: number;
  vocabSeen: number;
  englishEpisodesCompleted: number;
  srsByState: { new: number; learning: number; review: number; relearning: number };
  currentStreak: number;
  totalXp: number;
}

export interface EvaluationResult {
  unlocked: string[]; // achievement slugs
  xpAwarded: number;
}

/**
 * Evaluate a set of achievement rules against a user context.
 *
 * @param definitions  all known achievements (typically from the DB)
 * @param context      user state snapshot
 * @param alreadyUnlocked  set of achievement slugs the user already has,
 *                         to avoid re-awarding XP
 */
export function evaluateAchievements(
  definitions: readonly AchievementDefinition[],
  context: AchievementContext,
  alreadyUnlocked: ReadonlySet<string> = new Set(),
): EvaluationResult {
  const unlocked: string[] = [];
  let xpAwarded = 0;
  for (const def of definitions) {
    if (alreadyUnlocked.has(def.slug)) continue;
    if (matches(def.rule, context)) {
      unlocked.push(def.slug);
      xpAwarded += def.xp;
    }
  }
  return { unlocked, xpAwarded };
}

/** Public rule matcher — used both by the engine and by tests. */
export function matches(rule: AchievementRule, ctx: AchievementContext): boolean {
  switch (rule.kind) {
    case 'lesson_count': {
      if (rule.track) {
        return (ctx.lessonsCompletedByTrack[rule.track] ?? 0) >= rule.count;
      }
      return ctx.lessonsCompleted >= rule.count;
    }
    case 'streak':
      return ctx.currentStreak >= rule.days;
    case 'srs_state':
      return ctx.srsByState[rule.state] >= rule.count;
    case 'xp_threshold':
      return ctx.totalXp >= rule.xp;
    case 'quiz_perfect':
      return ctx.quizzesPerfect >= rule.count;
    case 'lab_completed':
      return ctx.labsCompleted >= rule.count;
    case 'project_completed':
      return ctx.projectsCompleted >= rule.count;
    case 'vocab_count':
      return ctx.vocabSeen >= rule.count;
    case 'english_episodes':
      return ctx.englishEpisodesCompleted >= rule.count;
    case 'all_of':
      return rule.rules.every((r) => matches(r, ctx));
  }
}

/** Helper for the "first N" boilerplate rule shape. */
export function lessonCountRule(count: number, track?: string): AchievementRule {
  return track ? { kind: 'lesson_count', count, track } : { kind: 'lesson_count', count };
}

/** Curated achievement seeds for boot-time seeding. */
export const DEFAULT_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-lesson',
    slug: 'first-lesson',
    title: 'First steps',
    description: 'Complete your first lesson.',
    icon: '👶',
    xp: 25,
    rule: lessonCountRule(1),
  },
  {
    id: 'devops-5',
    slug: 'devops-5',
    title: 'DevOps curious',
    description: 'Complete 5 DevOps lessons.',
    icon: '🐧',
    xp: 50,
    rule: lessonCountRule(5, 'devops'),
  },
  {
    id: 'devops-25',
    slug: 'devops-25',
    title: 'DevOps practitioner',
    description: 'Complete 25 DevOps lessons.',
    icon: '⚙️',
    xp: 200,
    rule: lessonCountRule(25, 'devops'),
  },
  {
    id: 'streak-3',
    slug: 'streak-3',
    title: 'Three in a row',
    description: 'Maintain a 3-day learning streak.',
    icon: '🔥',
    xp: 30,
    rule: { kind: 'streak', days: 3 },
  },
  {
    id: 'streak-7',
    slug: 'streak-7',
    title: 'Week warrior',
    description: 'Maintain a 7-day learning streak.',
    icon: '🔥',
    xp: 100,
    rule: { kind: 'streak', days: 7 },
  },
  {
    id: 'streak-30',
    slug: 'streak-30',
    title: 'Monthly master',
    description: 'Maintain a 30-day learning streak.',
    icon: '🏆',
    xp: 500,
    rule: { kind: 'streak', days: 30 },
  },
  {
    id: 'srs-50',
    slug: 'srs-50',
    title: 'In review',
    description: 'Have 50 cards in the "review" SRS state.',
    icon: '🧠',
    xp: 100,
    rule: { kind: 'srs_state', state: 'review', count: 50 },
  },
  {
    id: 'xp-100',
    slug: 'xp-100',
    title: 'Century',
    description: 'Earn 100 XP.',
    icon: '💯',
    xp: 0,
    rule: { kind: 'xp_threshold', xp: 100 },
  },
  {
    id: 'xp-1000',
    slug: 'xp-1000',
    title: 'Millennium',
    description: 'Earn 1,000 XP.',
    icon: '🌟',
    xp: 0,
    rule: { kind: 'xp_threshold', xp: 1000 },
  },
  {
    id: 'vocab-100',
    slug: 'vocab-100',
    title: 'Wordsmith',
    description: 'Study 100 vocabulary words.',
    icon: '📚',
    xp: 50,
    rule: { kind: 'vocab_count', count: 100 },
  },
  {
    id: 'english-arc-1',
    slug: 'english-arc-1',
    title: 'First story',
    description: 'Complete 1 English episode.',
    icon: '🌐',
    xp: 25,
    rule: { kind: 'english_episodes', count: 1 },
  },
  {
    id: 'meta-fully-loaded',
    slug: 'meta-fully-loaded',
    title: 'Fully loaded',
    description: 'Have 5 lessons completed AND a 3-day streak.',
    icon: '⭐',
    xp: 75,
    rule: {
      kind: 'all_of',
      rules: [lessonCountRule(5), { kind: 'streak', days: 3 }],
    },
  },
];
