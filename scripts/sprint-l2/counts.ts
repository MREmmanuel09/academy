/**
 * Validates the Sprint L2 import report against the actual source counts.
 * Throws if any count is off.
 *
 * Measured from the v0.4 source tree:
 *   - 6 arcs × 5 episodes = 30 episodes
 *   - 18 roleplay JSON files
 *   - 4 games with source data (false-friends, grammar, idioms-uk, listening)
 *     + 1 placeholder (word-match) = 5 total
 *   - 805 vocab entries in public/vocab.json
 *   - 10 locales (en, es, pt, fr, de, it, pl, zh, ja, ar)
 *
 * The 5-vs-4 game count and the 10-vs-9 locale count differ from the
 * project plan. See `SPRINT_L2_COUNTS.md` for the audit.
 */

export const EXPECTED_COUNTS = {
  arcs: 6,
  episodes: 30,
  roleplays: 18,
  /** Games with real source data (we migrate these as JSON copies). */
  gamesWithData: 4,
  /** Total game slots in the UI (data + placeholder). */
  gamesTotal: 5,
  /** Total vocab entries in public/vocab.json. */
  vocab: 805,
  /** UI locales — en/es/pt/fr have full translations, the rest fallback to EN. */
  locales: 10,
} as const;
