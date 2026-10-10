# Architecture

> Technical architecture of the Academy platform.

## Overview

Academy is a **monorepo** built with **pnpm workspaces**. A single Next.js 15 app serves all features, backed by a single database. Content is loaded from static files at request time; user state lives in the database.

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 15 App                   │
│                 (App Router + React 19)              │
├─────────────┬─────────────┬─────────────┬───────────┤
│  UI Layer   │  DB Layer   │  i18n Layer │ Content   │
│  (shadcn)   │  (Drizzle)  │ (next-intl) │ (MDX/YAML)│
├─────────────┴─────────────┴─────────────┴───────────┤
│              SQLite (dev) / PostgreSQL (prod)         │
└─────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
academy/
├── apps/
│   └── web/                    # Next.js 15 app (the only deployable)
├── packages/
│   ├── content/                # Static course content (MDX + JSON)
│   ├── db/                     # Drizzle ORM schema + migrations
│   ├── i18n/                   # Locale catalogs + next-intl config
│   └── ui/                     # shadcn-style component library
├── docker/                     # Entrypoint + Docker support files
├── scripts/                    # One-off maintenance scripts
└── .github/workflows/          # CI/CD pipelines
```

## Data Model

### Schema Domains

| Domain | Tables | Purpose |
|--------|--------|---------|
| **users** | `users` | Account info, preferences |
| **auth** | `accounts`, `sessions`, `verificationTokens` | Auth.js v5 adapter |
| **content** | `courses`, `units`, `lessons`, `quizzes`, `questions`, `labs`, `projects` | Course hierarchy |
| **progress** | `user_progress`, `user_quiz_attempts`, `user_xp`, `user_streaks`, `user_ability` | Learning state |
| **srs** | `srs_cards`, `vocab` | Spaced repetition (FSRS-6) |
| **english** | `arcs`, `episodes`, `roleplays`, `mini_games` | Sprint L2 domain |
| **ai** | `ai_conversations`, `ai_feedback` | AI roleplay/writing |
| **gamification** | `achievements`, `user_achievements`, `activity_log` | XP, levels, streaks |

### Key Relationships

```
User ─┬── user_progress ── Lesson
      ├── srs_cards ────── (polymorphic: lesson/vocab/roleplay/episode)
      ├── user_xp ──────── (denormalized XP/level)
      ├── user_streaks ─── (consecutive days)
      ├── user_ability ─── (IRT theta)
      └── user_achievements ── Achievement
```

### Content vs State Split

- **Content** (static, read-only): Lessons, labs, projects, exams, vocab → loaded from `packages/content` filesystem
- **State** (dynamic, per-user): Progress, SRS cards, XP, achievements → stored in database

This split means content updates require a rebuild, but user state is always live.

## Request Flow

```
Browser Request
     │
     ▼
Next.js Middleware (i18n routing + auth check)
     │
     ▼
Layout (server component: session, nav)
     │
     ▼
Page (server component: DB queries, content loading)
     │
     ▼
Client Components (interactive: forms, SRS, quiz)
     │
     ▼
Server Actions ('use server': mutations)
     │
     ▼
Drizzle ORM → SQLite/PostgreSQL
```

### Server Actions

All mutations go through Server Actions (not API routes):

| Action | Purpose |
|--------|---------|
| `registerAction` / `loginAction` | Auth with rate limiting |
| `markLessonCompleteAction` | Lesson completion + XP |
| `reviewSrsCardAction` | SRS card review (FSRS-6) |
| `enqueueSrsCardAction` | Add card to SRS deck |
| `startQuizAction` / `submitQuizAnswerAction` | Adaptive quiz flow |
| `syncOfflineMutation` | Replay offline mutations |

### Authentication

- **Auth.js v5** with Credentials provider
- **JWT sessions** (30-day max age)
- **Edge-compatible** middleware checks cookie presence
- **Server-side** bcrypt verification in `authorize()`

## Algorithms

### FSRS-6 (Spaced Repetition)

Uses the official `ts-fsrs` library. Each card has a full state:

```typescript
{
  state: 'new' | 'learning' | 'review' | 'relearning';
  due: string;           // ISO date
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
}
```

Reviews apply the FSRS-6 algorithm: `reviewCard(state, rating)` → new state.

### IRT (Item Response Theory)

Adaptive quiz uses 2PL model with guessing:

```
P(θ) = c + (1-c) / (1 + e^(-a(θ-b)))
```

- **θ** (theta): user ability estimate
- **a**: item discrimination
- **b**: item difficulty
- **c**: guessing parameter

Question selection uses **Maximum Information Selection**: picks the question that maximizes information at the current θ estimate.

### Gamification

- **XP**: Quadratic curve `50 × (L-1)²`
- **Level**: Derived from total XP
- **Streaks**: Consecutive days with activity (timezone-aware)
- **Rate limiting**: Per-kind buckets (SRS: 200/min, lessons: 20/min)

## Offline Architecture

### What Works Offline (read-only)

- Lesson content (CacheFirst, 30-day TTL)
- Static assets (CacheFirst, 30-day TTL)
- Dashboard/practice pages (NetworkFirst, 3s timeout)
- Media files (CacheFirst, 30-day TTL)

### Offline Mutations

When offline, mutations are queued in IndexedDB:

```
User Action → queueMutation() → IndexedDB
                                    │
                  (online restored) │
                                    ▼
                              syncPending()
                                    │
                                    ▼
                         syncOfflineMutation()
                                    │
                                    ▼
                              Server Action
```

Supported offline actions:
- `reviewSrsCard`: SRS review with optimistic UI
- `markLessonComplete`: Lesson completion

### Background Sync

The `useOfflineSync` hook manages:
- Online/offline detection
- Queue management (add, count, sync)
- Auto-sync on reconnection

## i18n

- **10 UI locales**: es, en, pt, fr, de, it, pl, zh, ja, ar
- **2 content locales**: es, en (bilingual content)
- Non-bilingual locales see Spanish content with translated UI
- RTL support for Arabic (`dir="rtl"`)

## PWA

- **Service Worker**: Generated at build time via Workbox
- **Caching**: 7 runtime rules (CacheFirst for static, NetworkFirst for API)
- **Offline**: Dashboard, courses, lessons, vocab, SRS review all render from cache
- **Install**: Standalone display, home screen shortcuts

## Deployment

### Single Instance (SQLite)

```bash
docker compose up --build -d
```

- SQLite file persisted in named volume
- Entrypoint runs idempotent schema migration
- Healthcheck: `GET /academy/api/health` every 30s

### Multi-Instance (PostgreSQL)

1. Uncomment `postgres` service in docker-compose.yml
2. Set `DATABASE_URL=postgresql://...`
3. Sessions are JWT-based → horizontal scaling works out of the box

### Behind Reverse Proxy

- Set `AUTH_TRUST_HOST=true`
- Use Cloudflare Tunnel or nginx with `X-Forwarded-For`
