/**
 * Schema barrel — single source of truth for all DB tables.
 *
 * Domains:
 *   - users:           user accounts
 *   - auth:            Auth.js v5 (accounts, sessions, verificationTokens)
 *   - content:         courses, units, lessons, quizzes, questions, labs, projects
 *   - progress:        user_progress, user_quiz_attempts, user_xp, user_streaks, user_ability
 *   - srs:             srs_cards (FSRS-6 state), vocab
 *   - english:         arcs, episodes, roleplays, mini_games (Sprint L2 content)
 *   - ai:              ai_conversations, ai_feedback
 *   - gamification:    achievements, user_achievements, activity_log
 */
export * from './users';
export * from './auth';
export * from './content';
export * from './progress';
export * from './srs';
export * from './english';
export * from './ai';
export * from './gamification';
export * from './user-settings';
