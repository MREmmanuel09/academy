# API Reference

> Server Actions and API routes in the Academy platform.

All mutations use **Server Actions** (not REST API routes). Read operations use server components directly.

## Server Actions

### Authentication

#### `registerAction(formData: FormData): Promise<ActionResult>`

Register a new user with email + password.

**Fields:**
- `email` (string, required)
- `password` (string, required)
- `name` (string, required)
- `preferredLocale` (string, default: `'es'`)

**Rate limit:** 3 attempts per hour per IP.

**Returns:** `{ ok: true }` on success (redirects to `/onboarding`), or `{ ok: false, error, fieldErrors }`.

---

#### `loginAction(formData: FormData): Promise<ActionResult>`

Log in with email + password.

**Fields:**
- `email` (string, required)
- `password` (string, required)

**Rate limit:** 5 attempts per 15 minutes per IP.

**Returns:** `{ ok: true }` on success (redirects to `/dashboard`), or `{ ok: false, error }`.

---

#### `logoutAction(): Promise<void>`

Log out and redirect to home page.

---

#### `completeOnboardingAction(formData: FormData): Promise<ActionResult>`

Save locale/timezone/goals after registration.

**Fields:**
- `preferredLocale` (string)
- `timezone` (string, default: `'UTC'`)
- `goals` (string[])

---

### Progress

#### `markLessonCompleteAction(courseSlug, unitSlug, lessonSlug): Promise<ActionResult>`

Mark a lesson as complete. Idempotent (no double XP).

**Parameters:**
- `courseSlug` (string)
- `unitSlug` (string)
- `lessonSlug` (string)

**Side effects:**
- Inserts/updates `user_progress` row
- Awards 10 XP via `applyXpBatch`
- Updates `user_xp` table
- Logs activity to `activity_log`
- Revalidates cache for course and dashboard pages

---

### Spaced Repetition (SRS)

#### `loadSrsQueueAction(limit, filter?): Promise<SrsCard[]>`

Load up to `limit` due SRS cards for the current user.

**Parameters:**
- `limit` (number)
- `filter?` (`'lesson' | 'vocab' | 'roleplay' | 'episode'`)

---

#### `reviewSrsCardAction(cardId, rating): Promise<ReviewResult>`

Apply a review to an SRS card using FSRS-6.

**Parameters:**
- `cardId` (string)
- `rating` (`'again' | 'hard' | 'good' | 'easy'`)

**Returns:**
```typescript
{
  ok: true;
  newState: SrState;
  xpAwarded: number;  // always 1
}
```

---

#### `enqueueSrsCardAction(cardType, contentId): Promise<string>`

Add a card to the SRS deck. Idempotent (returns existing ID if already present).

**Parameters:**
- `cardType` (`'lesson' | 'vocab' | 'roleplay' | 'episode'`)
- `contentId` (string)

**Returns:** Card ID (string).

---

#### `countDueCardsAction(filter?): Promise<number>`

Count due SRS cards for the badge indicator.

---

### Quiz

#### `startQuizAction(quizId): Promise<QuizAttempt>`

Start a new quiz attempt.

**Parameters:**
- `quizId` (string)

**Returns:** Quiz attempt with `id`, `theta` (initial ability estimate).

---

#### `nextQuizQuestionAction(quizId, seenIds, theta): Promise<Question | null>`

Select the next quiz question using Maximum Information Selection (IRT).

**Parameters:**
- `quizId` (string)
- `seenIds` (string[]) — question IDs already shown
- `theta` (number) — current ability estimate

**Returns:** Next question or `null` if quiz is complete.

---

#### `submitQuizAnswerAction(quizId, questionId, answer, elapsedMs, responses, seenIds): Promise<QuizResult>`

Submit an answer and get the next question or final results.

**Parameters:**
- `quizId` (string)
- `questionId` (string)
- `answer` (string | string[])
- `elapsedMs` (number)
- `responses` (Array of previous responses)
- `seenIds` (string[])

**Returns:**
```typescript
{
  correct: boolean;
  explanation: string;
  nextQuestion: Question | null;  // null if quiz complete
  score?: number;                 // only when quiz is complete
  xpAwarded?: number;            // only when quiz is complete
}
```

---

### Settings

#### `updateProfileAction(formData: FormData): Promise<ActionResult>`

Update user profile (name, locale, timezone).

#### `saveAiConfigAction(formData: FormData): Promise<ActionResult>`

Save AI provider configuration (OpenAI, Anthropic, Ollama keys).

#### `exportUserDataAction(): Promise<string>`

Export all user data as JSON (GDPR compliance).

---

### Import

#### `importUserDataAction(formData: FormData): Promise<ImportResult>`

Import data from legacy platforms (RedLab v6, Sprint L2, Academy backup).

**Supported sources (auto-detected):**
- RedLab v6 export
- Sprint L2 export
- Academy canonical format

**Idempotent:** Re-running with the same file is a no-op.

---

### Offline Sync

#### `syncOfflineMutation(mutation): Promise<SyncResult>`

Sync a single offline mutation to the server.

**Parameters:**
```typescript
{
  action: 'reviewSrsCard' | 'markLessonComplete';
  payload: unknown;
}
```

**Supported actions:**

| Action | Payload | Notes |
|--------|---------|-------|
| `reviewSrsCard` | `{ cardId, rating }` | Validates card ownership |
| `markLessonComplete` | `{ courseSlug, unitSlug, lessonSlug }` | Validates lesson exists |

---

## API Routes

### `GET /api/health` (public path: `/academy/api/health`)

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "academy-web",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### `POST /api/auth/[...nextauth]`

Auth.js v5 catch-all route. Handles:
- `POST /api/auth/signin` — Sign in
- `POST /api/auth/signout` — Sign out
- `GET /api/auth/session` — Get current session
- `GET /api/auth/csrf` — Get CSRF token
- `GET /api/auth/providers` — List configured providers

---

## Rate Limiting

Applied to authentication endpoints:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Register | 3 attempts | 1 hour |
| API (general) | 60 requests | 1 minute |

Rate limiting is per-IP using an in-memory sliding window counter. For multi-instance deployments, consider Redis-backed rate limiting.

---

## Error Handling

All Server Actions return `ActionResult`:

```typescript
type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Client components check `result.ok` and display errors via `role="alert"`.

---

## Caching

### Server-Side

- Content is cached in memory after first read (per process lifetime)
- `revalidatePath()` called after mutations to invalidate Next.js cache

### Client-Side (PWA)

| Asset | Strategy | TTL |
|-------|----------|-----|
| Static assets | CacheFirst | 30 days |
| API calls | NetworkFirst | 1 day |
| Dashboard/practice | NetworkFirst | 7 days |
| Lesson content | CacheFirst | 30 days |
| General navigation | StaleWhileRevalidate | 1 day |
