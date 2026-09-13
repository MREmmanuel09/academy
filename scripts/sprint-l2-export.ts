#!/usr/bin/env node
/**
 * Sprint L2 user-data exporter.
 *
 * Sprint L2 stores each user's data in a local SQLite DB
 * (`./sprint-l2.db`). The Academy import UI accepts JSON, so this
 * CLI script reads the DB and prints a JSON document matching
 * `CanonicalImport`.
 *
 * Usage:
 *   pnpm tsx scripts/sprint-l2-export.ts \
 *     --db ./sprint-l2.db \
 *     --user <userId>  > user-export.json
 *
 * If `--user` is omitted, the first row in `users` is used.
 *
 * ## Why a CLI and not a server endpoint
 *
 * Sprint L2 runs locally on the user's machine and the DB often
 * contains sensitive transcripts. The user runs this script on the
 * same machine and uploads the resulting JSON to Academy.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface CliArgs {
  dbPath: string;
  userId: string | null;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dbPath: './sprint-l2.db',
    userId: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db' && argv[i + 1]) {
      args.dbPath = argv[++i] as string;
    } else if (a === '--user' && argv[i + 1]) {
      args.userId = argv[++i] as string;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

interface SqliteRow {
  [key: string]: unknown;
}

interface SqliteLike {
  prepare: (sql: string) => {
    all: (...params: unknown[]) => SqliteRow[];
    get: (...params: unknown[]) => SqliteRow | undefined;
  };
  close: () => void;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'Usage: tsx scripts/sprint-l2-export.ts --db <path> [--user <id>]\n',
    );
    return;
  }
  const absDb = resolve(args.dbPath);
  if (!existsSync(absDb)) {
    process.stderr.write(`Sprint L2 database not found at ${absDb}\n`);
    process.exit(1);
  }

  // We use better-sqlite3 because Sprint L2 itself does. The script
  // runs on the user's machine; they can install it as a devDependency.
  // Lazy-load so the Academy app build doesn't need to bundle it.
  let Database: unknown;
  try {
    // Resolve from the monorepo root; better-sqlite3 is a transitive
    // dependency of Sprint L2 and a regular dep of many CLIs. If the
    // user doesn't have it, we tell them to install it.
    // biome-ignore lint/suspicious/noExplicitAny: dynamic require.
    const mod = await import('better-sqlite3');
    Database = mod.default ?? mod;
  } catch (err) {
    process.stderr.write(
      `Could not load better-sqlite3. Install it with: pnpm add -D better-sqlite3\nUnderlying error: ${(err as Error).message}\n`,
    );
    process.exit(1);
  }
  // biome-ignore lint/suspicious/noExplicitAny: dynamic open.
  const sqlite = new (Database as any)(absDb, { readonly: true });
  const db = sqlite as SqliteLike;

  try {
    const users = db
      .prepare('SELECT * FROM users ORDER BY created_at ASC LIMIT 50')
      .all();
    if (users.length === 0) {
      process.stderr.write('No users found in the Sprint L2 database.\n');
      process.exit(2);
    }
    const user = args.userId
      ? users.find((u) => u.id === args.userId)
      : users[0];
    if (!user) {
      process.stderr.write(
        `User "${args.userId}" not found. Available ids: ${users
          .slice(0, 5)
          .map((u) => String(u.id))
          .join(', ')}\n`,
      );
      process.exit(2);
    }
    const userId = String(user.id);

    const progress = db
      .prepare('SELECT * FROM progress WHERE user_id = ? LIMIT 1')
      .get(userId);

    const userCards = db
      .prepare(
        'SELECT * FROM user_cards WHERE user_id = ? ORDER BY created_at ASC',
      )
      .all(userId);

    const roleplaySessions = db
      .prepare(
        'SELECT id, user_id, scenario_id, started_at, ended_at, transcript, feedback_json FROM roleplay_sessions WHERE user_id = ? ORDER BY started_at ASC',
      )
      .all(userId);

    const learningEvents = db
      .prepare(
        'SELECT id, user_id, timestamp, type, subtype, duration_seconds, result_json FROM learning_events WHERE user_id = ? ORDER BY timestamp ASC',
      )
      .all(userId);

    const doc = {
      source: 'sprint-l2' as const,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        createdAt: user.created_at,
        l1: user.l1,
        targetLevel: user.target_level,
        currentLevelReading: user.current_level_reading,
        currentLevelListening: user.current_level_listening,
        currentLevelSpeaking: user.current_level_speaking,
        currentLevelWriting: user.current_level_writing,
        interests: user.interests,
        preferredAccent: user.preferred_accent,
        planMinutesPerDay: user.plan_minutes_per_day,
      },
      progress: progress
        ? {
            userId: progress.user_id,
            currentArc: progress.current_arc,
            currentEpisode: progress.current_episode,
            episodesCompleted: parseEpisodesCompleted(progress.episodes_completed),
            vocabularySizeReceptive: progress.vocabulary_size_receptive,
            vocabularySizeProductive: progress.vocabulary_size_productive,
            lastVltDate: progress.last_vlt_date,
            lastCefrTestDate: progress.last_cefr_test_date,
          }
        : null,
      userCards: userCards.map((c) => ({
        id: c.id,
        userId: c.user_id,
        cardId: c.card_id,
        fsrsState: c.fsrs_state,
        fsrsDue: c.fsrs_due,
        fsrsStability: c.fsrs_stability,
        fsrsDifficulty: c.fsrs_difficulty,
        fsrsElapsedDays: c.fsrs_elapsed_days,
        fsrsScheduledDays: c.fsrs_scheduled_days,
        fsrsReps: c.fsrs_reps,
        fsrsLapses: c.fsrs_lapses,
        fsrsLastReview: c.fsrs_last_review,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      roleplaySessions: roleplaySessions.map((r) => ({
        id: r.id,
        userId: r.user_id,
        scenarioId: r.scenario_id,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        transcript: r.transcript,
        feedbackJson: r.feedback_json,
      })),
      learningEvents: learningEvents.map((e) => ({
        id: e.id,
        userId: e.user_id,
        timestamp: e.timestamp,
        type: e.type,
        subtype: e.subtype,
        durationSeconds: e.duration_seconds,
        resultJson: e.result_json,
      })),
    };

    process.stdout.write(JSON.stringify(doc, null, 2));
    process.stdout.write('\n');
  } finally {
    db.close();
  }
}

function parseEpisodesCompleted(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // not JSON
  }
  return [];
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
