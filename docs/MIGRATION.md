# User data migration

Bring progress, SRS cards, achievements, and activity from **RedLab v6**
or **Sprint L2** into Academy. Passwords and personal info are not
migrated — you sign in to Academy with your Academy credentials.

## Table of contents

1. [Supported sources](#supported-sources)
2. [How it works](#how-it-works)
3. [Export from RedLab v6](#export-from-redlab-v6)
4. [Export from Sprint L2](#export-from-sprint-l2)
5. [Import to Academy](#import-to-academy)
6. [Re-importing (idempotency)](#re-importing-idempotency)
7. [What gets mapped](#what-gets-mapped)
8. [Troubleshooting](#troubleshooting)
9. [Data format reference](#data-format-reference)

## Supported sources

| Source     | File format | How to produce it                       |
| ---------- | ----------- | --------------------------------------- |
| RedLab v6  | JSON        | Already an export from the RedLab app   |
| Sprint L2  | JSON        | Run `pnpm tsx scripts/sprint-l2-export.ts` against your `sprint-l2.db` |
| Academy    | JSON        | Use the "Download JSON" button in `/settings` |

## How it works

1. You produce a JSON file from your old app (see below).
2. Sign in to Academy and open **Settings → Import from RedLab / Sprint L2** (path: `/settings/import`).
3. Upload the JSON file. We parse it in memory, run the migration, and show a summary.
4. The file is **discarded** — it is never stored, never logged in full, and never sent to a third party.

All inserts use `onConflictDoNothing()`, so re-running with the same
file is a no-op: nothing is duplicated, nothing is overwritten.

## Export from RedLab v6

RedLab v6 stores user state in `localStorage` (namespaced by user). The
official export is:

1. Open RedLab v6 in your browser.
2. Go to **Settings → Export / Backup**.
3. Click **Download JSON**. Your browser saves a `redlab-export.json`.

The export includes:

- `version: 6` — used to validate the import.
- `progress.completedLessons[]` — lesson IDs you completed.
- `progress.completedLabs[]` — lab IDs you completed.
- `progress.quizScores{}` — best score per quiz.
- `progress.xp`, `progress.streak`, `progress.lastActive`.
- `examAttempts[]` — every exam attempt.
- `earnedBadges[]`, `earnedAchievements[]` — IDs.
- `srsReviews{}` — SM-2 spaced-repetition state per lesson.
- `bookmarks[]` — bookmarked lesson IDs.
- `diagnosticResult` — initial level assessment.
- `interactiveExercises{}` — in-lesson interactive exercise scores.

## Export from Sprint L2

Sprint L2 stores user data in a local SQLite file (`./sprint-l2.db`).
The CLI tool in this repo converts it to JSON.

```bash
# from the monorepo root
pnpm add -D better-sqlite3    # one-time, if you don't have it
pnpm tsx scripts/sprint-l2-export.ts --db ./sprint-l2.db --user <id> > sprint-l2-export.json
```

If you have only one user in the DB, you can omit `--user`. The CLI
prints the JSON to stdout — redirect to a file and you're done.

The export includes:

- `user` — your profile (l1, target level, CEFR skill levels).
- `progress.episodesCompleted` — episodes you finished.
- `userCards[]` — FSRS-6 SRS state per vocab word.
- `roleplaySessions[]` — every roleplay transcript.
- `learningEvents[]` — capped at 200 events to keep the import small.

## Import to Academy

1. Sign in at `/login`.
2. Open `/settings/import` (or **Settings → Import from RedLab / Sprint L2**).
3. Click the dropzone and select your JSON file.
4. Click **Import**. The page reloads with a summary:
   - **Imported**: counts of lessons, labs, quiz attempts, SRS cards, achievements, activity events.
   - **Skipped**: items that don't exist in the destination DB (e.g. lesson IDs that no longer exist). These are dropped without error.
   - **Warnings**: parser-level warnings (malformed fields, missing dates, etc.).

## Re-importing (idempotency)

Re-running with the same file is safe. Every write uses
`onConflictDoNothing()` against the unique constraints:

- `uq_user_lesson` — same lesson + same version, no duplicate.
- `uq_user_card` — same `(userId, cardType, contentId)`, no duplicate.
- `uq_user_achievement` — same achievement, no duplicate.

For XP and streaks, the importer takes the **max** of existing and
imported values — it never lowers your progress.

## What gets mapped

### RedLab v6 → Academy

| RedLab field                      | Academy table                |
| --------------------------------- | ---------------------------- |
| `progress.completedLessons[]`     | `user_progress`              |
| `progress.completedLabs[]`        | `activity_log` (event=lab_completed) |
| `progress.quizScores{}`           | `user_quiz_attempts`         |
| `progress.examAttempts[]`         | `user_quiz_attempts` (kind=exam) |
| `progress.xp`                     | `user_xp.totalXp` (max)      |
| `progress.streak` / `lastActive`  | `user_streaks`               |
| `earnedBadges[]`                  | `activity_log` (badge_earned) |
| `earnedAchievements[]`            | `user_achievements` by slug; unknown → `activity_log` |
| `srsReviews{}` (SM-2)             | `srs_cards` (cardType=lesson) with converted FSRS-6 state |
| `bookmarks[]`                     | `activity_log` (bookmark)    |
| `diagnosticResult`                | `activity_log` (diagnostic)  |
| `interactiveExercises{}`          | `activity_log` (interactive_exercise) |

### Sprint L2 → Academy

| Sprint L2 field                   | Academy table                |
| --------------------------------- | ---------------------------- |
| `user.l1`                         | `users.preferred_locale`     |
| `progress.episodesCompleted[]`    | `srs_cards` (cardType=episode) + `activity_log` |
| `userCards[]`                     | `srs_cards` (cardType=vocab) with FSRS-6 state copy |
| `progress.vocabularySize*`        | `activity_log` (vocab_milestone) |
| `roleplaySessions[]`              | `activity_log` (roleplay_session) |
| `learningEvents[]` (≤200)         | `activity_log` (sprint_l2_event) |
| `progress.lastCefrTestDate`       | `user_quiz_attempts` (kind=exam) with derived score |

## Troubleshooting

**"File exceeds 5/10 MB"** — the export is too large. For Sprint L2,
this is usually because the DB has many learning events. The CLI caps
them at 200 by default; if you need more, edit
`scripts/sprint-l2-export.ts` and bump `MAX_EVENTS`.

**"Skipped: lesson `l-99`"** — the lesson ID exists in your RedLab
export but not in the Academy content DB. The import continues
without it. Verify the lesson was migrated in a recent version of
the Academy content.

**"Source version too new"** — your RedLab export has a `version`
field greater than 6. The importer doesn't know how to read it yet.
Open an issue with a sample file (redact PII first).

**My XP went down** — we take the **max** of existing and imported.
If you started using Academy first and accumulated some XP, then
imported older RedLab XP, your Academy XP wins.

**"Missing field"** — your export is missing a required section. For
RedLab that means `progress`; for Sprint L2 it means `source` or
`schemaVersion`. Re-export from the source app.

**"Not signed in"** — the importer requires an active session. Sign in
first, then upload the file.

**SRS cards are not in my deck** — the import verifies the underlying
content exists in the destination DB. If a vocab word was removed
from Sprint L2 since you exported, the card is skipped. The summary
shows the count.

## Data format reference

### Academy export (what `exportUserDataAction` produces)

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-08-31T18:00:00.000Z",
  "user": { "id": "...", "email": "...", "name": "...", "preferredLocale": "es", "timezone": "UTC" },
  "xp": { "userId": "...", "totalXp": 1240, "level": 5, "lastEventAt": 1756658400 },
  "streak": { "userId": "...", "currentStreak": 7, "longestStreak": 12, "lastActiveDate": "2026-08-30" },
  "progress": [{ "id": "...", "userId": "...", "lessonId": "l-1", "lessonVersion": 1, "status": "completed", "completedAt": 1756658400, "score": null }],
  "srsCards": [{ "id": "...", "userId": "...", "cardType": "vocab", "contentId": "vocab-airport", "state": { "state": "review", "due": "2026-09-01T10:00:00.000Z", "stability": 8.4, "difficulty": 4.1, "elapsed_days": 3, "scheduled_days": 5, "reps": 6, "lapses": 0, "last_review": "2026-08-29T10:00:00.000Z" } }],
  "vocabDeck": [{ "cardId": "...", "vocabId": "vocab-airport" }],
  "unlocks": [{ "id": "...", "userId": "...", "achievementId": "...", "unlockedAt": 1756658400 }],
  "quizAttempts": [{ "id": "...", "userId": "...", "quizId": "...", "score": 0.85, "correctCount": 17, "totalCount": 20, "durationMs": 48000 }],
  "activity": [{ "id": "...", "userId": "...", "event": "lesson_completed", "payload": {}, "createdAt": 1756658400 }]
}
```

This is the canonical format the importer accepts and produces. If you
want to migrate from a third tool, write a JSON file matching this
shape and the UI will accept it.
