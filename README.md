# Academy

> Unified learning platform: DevOps, Data, and English in one place.

[![Build](https://img.shields.io/github/actions/workflow/status/MREmmanuel09/academy/ci.yml?branch=main&style=flat-square)](https://github.com/MREmmanuel09/academy/actions)
[![Tests: 347 unit + 45 E2E](https://img.shields.io/badge/tests-347%20unit%20%2B%2045%20E2E-brightgreen?style=flat-square)](./apps/web/tests)
[![A11y: WCAG 2.1 AA](https://img.shields.io/badge/a11y-WCAG%202.1%20AA-blue?style=flat-square)](./apps/web/tests/e2e/a11y.spec.ts)
[![Docker](https://img.shields.io/badge/docker-multi--stage-2496ed?style=flat-square&logo=docker&logoColor=white)](./Dockerfile)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.6%20strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?style=flat-square)](https://web.dev/progressive-web-apps/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-%E2%89%A590-success?style=flat-square&logo=lighthouse&logoColor=white)](./.github/workflows/lighthouse.yml)
[![Coverage](https://img.shields.io/badge/coverage-target%2070%25-brightgreen?style=flat-square)](./vitest.config.ts)

**[Roadmap](#roadmap)** · **[Architecture](#architecture)** · **[HOMELAB guide](./HOMELAB.md)**

> **Deploy it yourself:** local `docker compose up --build` below, or on a
> homelab box with Tailscale Funnel + auto-updates from GHCR — see
> [HOMELAB.md §§ 10–11](./HOMELAB.md).

---

## Why

Two separate learning apps (`RedLab Academy` and `Sprint L2`) became a maintenance burden. **Academy** is a single, modern, open-source platform that unifies both:

- **DevOps / Data / Networking / Cloud** — migrated from RedLab (134 lessons, 28 labs, 7 projects, 14 exams, 45 achievements)
- **English** — migrated from Sprint L2 (30 episodes in 6 narrative arcs, 18 roleplays, 5 mini-games, 805 vocab words, 10 UI languages)

Real progress in a real database. No engagement hacks. No monetization. MIT.

## Features

- 🛤️ **Guided learning paths** (Networking → CCNA, DevOps → CKA/AWS) with levels, prerequisites, sequential gating and auto-remediation into SRS
- 📝 **Certification-style exams** — timer, pass/fail vs threshold, full review with explanations, recorded attempts
- 🔥 **Per-topic skill mastery** (Bayesian Knowledge Tracing) with dashboard heatmap and next-step recommendations
- 🗣️ **English speaking practice** — Web Speech recognition with word-accuracy scoring, shadowing per episode line
- 🎧 **Audio-first listening** + TTS everywhere, downloadable study guides per path
- 💻 **In-browser code playground** (Python/SQL) and interactive network topologies in labs
- 🔁 **FSRS-6 spaced repetition** (the same algorithm Anki uses, with the official `ts-fsrs` lib)
- 🎯 **IRT adaptive testing** (Item Response Theory — questions adapt to your ability, SE-based stopping)
- 📊 **Offline IRT calibration script** (`db:calibrate`) refines question params from real attempts
- 🏆 **45 achievements** with declarative rules
- 📅 **Daily goals + streaks** (UTC, computed client-side for timezone correctness)
- 🌍 **Multi-language UI** (es, en, pt, fr, de, it, pl, zh, ja, ar via next-intl)
- 📦 **PWA** — installable, offline-capable (lessons, practice and dashboard survive offline)
- 🤖 **Optional AI feedback** (OpenAI / Anthropic / local Ollama) — off by default
- 🔐 **Auth.js v5** with credentials + rate limiting
- 🧪 **TypeScript strict** — zero `any`, `noUncheckedIndexedAccess` enabled

## Tech stack

| Layer        | Choice                                                            |
| ------------ | ----------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + React 19 + TypeScript 5.6 (strict)      |
| Styling      | Tailwind CSS 4 + shadcn-style primitives                          |
| ORM / DB     | Drizzle ORM · better-sqlite3 (dev) · PostgreSQL (prod, optional)  |
| Auth         | Auth.js v5 with DB sessions                                       |
| i18n         | next-intl                                                         |
| PWA          | @ducanh2912/next-pwa (maintained Next 15 fork)                     |
| State        | Zustand (client) + TanStack Query (server)                        |
| Forms        | react-hook-form + Zod                                             |
| Algorithms   | ts-fsrs (FSRS-6) + custom IRT                                     |
| Tests        | Vitest + Playwright + MSW                                         |
| Lint / fmt   | Biome                                                             |
| Hooks        | Husky + commitlint + lint-staged                                  |
| Container    | Docker multi-stage + docker-compose                               |

## Architecture

```mermaid
flowchart LR
  subgraph Apps
    Web[apps/web<br/>Next.js 15]
  end
  subgraph Packages
    UI[packages/ui<br/>shadcn-style]
    DB[packages/db<br/>Drizzle + SQLite/PG]
    I18N[packages/i18n<br/>next-intl]
    Content[packages/content<br/>MDX + YAML]
  end
  Web --> UI
  Web --> DB
  Web --> I18N
  Web --> Content
  DB --- SQLite[(SQLite dev)]
  DB --- PG[(PostgreSQL prod)]
```

A single Next.js app, one DB, one deploy. Content is loaded at build time from `packages/content` and treated as a typed contract.

## Getting started

Requires **Node.js 22+** and **pnpm 9+** (the project uses pnpm workspaces).

```bash
# 1. Install
pnpm install

# 2. Initialize the SQLite database (one-time, also runs on first dev start)
pnpm run db:push

# 3. Seed dev users
pnpm run db:seed

# 4. Start the dev server
pnpm run dev
# → http://localhost:3000
```

### Verifying the setup

```bash
pnpm run typecheck     # tsc --noEmit (workspaces)
pnpm run test:unit     # vitest run
pnpm run test:e2e      # playwright test
pnpm run lint          # biome check .
pnpm run build         # next build
```

## Project layout

```
academy/
├── apps/
│   └── web/                 # Next.js 15 app
│       ├── src/
│       │   ├── app/         # App Router routes (with [locale])
│       │   ├── components/  # App-specific React components
│       │   └── i18n/        # next-intl routing + request config
│       ├── public/          # PWA manifest, robots, icons
│       └── tests/           # unit (vitest) + e2e (playwright)
├── packages/
│   ├── db/                  # Drizzle schemas, client, seed scripts
│   ├── i18n/                # Locales, message catalogs, request config
│   ├── ui/                  # shadcn-style component library
│   └── content/             # Course/lesson type contracts
├── scripts/                 # One-off maintenance scripts
├── docker-compose.yml
├── Dockerfile
└── biome.json
```

## Development scripts

| Command                  | What it does                                           |
| ------------------------ | ------------------------------------------------------ |
| `pnpm run dev`           | Next.js dev server on `http://localhost:3000`          |
| `pnpm run build`         | Production build                                       |
| `pnpm run start`         | Run the production build                                |
| `pnpm run typecheck`     | `tsc --noEmit` across the workspace                    |
| `pnpm run test:unit`     | Vitest unit tests                                      |
| `pnpm run test:e2e`      | Playwright end-to-end tests                            |
| `pnpm run lint`          | Biome check (no writes)                                |
| `pnpm run lint:fix`      | Biome check with auto-fix                              |
| `pnpm run format`        | Biome format                                           |
| `pnpm run db:generate`   | Generate Drizzle migration files                       |
| `pnpm run db:push`       | Push schema directly (dev)                             |
| `pnpm run db:migrate`    | Apply migration files (prod)                           |
| `pnpm run db:seed`       | Idempotent dev seed (demo + admin users)               |
| `pnpm run db:seed:demo`  | Screenshot-ready demo seed (richer fixture)            |

## Docker

The repo ships a production-ready multi-stage build. Image size is around
**2.2 GB** on disk — the larger-than-minimal footprint comes from shipping
the full pnpm workspace (better-sqlite3 native binding, the full content
tree, all 10 locale message files) so the container can apply schema
migrations and serve every locale without rebuilds. See
[Why is the image so large?](#why-is-the-image-so-large) below for the
breakdown and the path to a slim build.

### Quick start

```bash
# 1. Generate a strong auth secret and seed the .env file
export AUTH_SECRET=$(openssl rand -base64 32)
export NEXT_PUBLIC_APP_URL=http://localhost:3000
export DATABASE_URL=file:/app/apps/web/data/prod.db

# 2. Build + start (SQLite, file-backed)
docker compose up --build -d

# 3. Tail logs until you see "Ready in"
docker compose logs -f web

# 4. Smoke test
curl -fsS http://localhost:3000/api/health
# {"status":"ok","service":"academy-web","timestamp":"..."}
```

The compose file:

- Maps container port `3000` to the host (`http://localhost:3000`).
- Persists the SQLite DB in a named volume (`academy-data-v2`) so
  `docker compose down && docker compose up` keeps your data.
- Runs as the non-root user `nextjs` (uid 1001).
- Configures a `wget`-based healthcheck that hits `/api/health` every 30s.
- Will apply `pnpm db:push` on every boot, **but only if the SQLite file
  is missing or the schema isn't in sync** (see the entrypoint below).

### Deploy to a homelab (GHCR + auto-updates)

`docker-compose.homelab.yml` runs the CI-built image from GHCR and keeps
it fresh with a health-gated Watchtower. Push to `main` → CI publishes
`ghcr.io/<owner>/<repo>:latest` → the homelab updates itself.

```bash
# On the homelab box (see HOMELAB.md §§ 10–11 for Tailscale Funnel):
git clone <repo> /opt/academy && cd /opt/academy
cp .env.homelab.example .env      # fill AUTH_SECRET + IMAGE_REPO + public URL
docker compose -f docker-compose.homelab.yml up -d
curl -fsS http://127.0.0.1:3000/api/health
```

Manual update/rollback: `IMAGE_TAG=sha-<commit> docker compose -f docker-compose.homelab.yml up -d web`
Backups: `docker exec academy-web /usr/local/bin/backup.sh`.

### Image layout

```text
Dockerfile
├── base    — node:22-alpine + pnpm 9.15.0 + sqlite CLI (for the
│             healthcheck) + wget
├── deps    — `pnpm fetch` (offline store) + `pnpm install` so
│             better-sqlite3 is prebuilt with the right libc.
│             Build toolchain (python3, make, g++) is added here and
│             removed before the runner stage.
├── builder — copy the populated store, run `pnpm --filter web build`
│             which produces `.next/`.
└── runner  — copy `.next`, public assets, the workspace sources, and
              the full node_modules. Switch to non-root `nextjs`,
              install the entrypoint, expose 3000.
```

### Entrypoint (`docker/entrypoint.sh`)

1. Parses `DATABASE_URL` to find the SQLite file path and ensures the
   parent directory exists.
2. Probes for the `users` table (via the `sqlite3` CLI). If the table
   is missing — i.e. fresh volume or first boot — runs
   `pnpm --filter @academy/db db:push` to apply the schema. Otherwise
   **skips the migration entirely** so restarts are idempotent.
3. `exec`s `next start` directly from the resolved pnpm store path
   (`node_modules/.pnpm/next@…/node_modules/next/dist/bin/next start`).
   This bypasses pnpm's workspace filter, which can return "no
   projects matched" from inside a slim runtime image.

### Why is the image so large?

- **Full `node_modules` (~1.5 GB)** — we don't enable Next's standalone
  output because the standalone build creates symlinks that require
  Linux or Windows Developer Mode. Until our Windows CI matches Docker
  we ship the full tree.
- **Workspace sources** — `packages/content` carries all 106 lessons,
  18 labs, 7 projects, 805 vocabulary words, 30 episodes, 18 roleplays,
  and 4 games. That's the curriculum, not bloat.
- **All 10 locale message files** — required so the server can render
  every locale at runtime.

To slim down later: enable `output: 'standalone'` in `apps/web/next.config.ts`
(Linux-only), trim `packages/content` for the prod build, or run a
`pnpm prune --prod` in the runner.

### Switching to PostgreSQL

Uncomment the `postgres` service at the bottom of `docker-compose.yml`
and point the web service at it:

```yaml
# apps/web/environment in docker-compose.yml
DATABASE_URL: postgresql://academy:academy@postgres:5432/academy
```

Drizzle picks up the URL prefix and switches the driver automatically.
Schema migrations are run by the entrypoint on every boot, so first
start will create every table.

### Environment variables

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `AUTH_SECRET` | yes | — | `openssl rand -base64 32`. Auth.js v5 JWT signing. |
| `DATABASE_URL` | no | `file:/app/apps/web/data/prod.db` | `file:…` → SQLite, `postgres://…` → Postgres. |
| `NEXT_PUBLIC_APP_URL` | no | `http://localhost:3000` | Public origin (used for OG tags, redirects). |
| `NEXT_PUBLIC_PWA_ENABLED` | no | `true` | Set `false` to disable the service worker. |
| `AUTH_TRUST_HOST` | no | unset | Set `true` behind a reverse proxy so Auth.js trusts the `Host` header. |
| `CI` | no | unset | Set to `true` to skip the interactive seed prompt. |

### Deploy guides

- **Single-VPS or Raspberry Pi behind Cloudflare Tunnel** —
  [HOMELAB.md](./HOMELAB.md) walks through `cloudflared`, systemd, and
  daily SQLite backups via `cron`.
- **Kubernetes / multi-instance** — the Postgres service in
  `docker-compose.yml` is the template; sessions are already JWT-based
  so horizontal scaling is straightforward.

## PWA & offline

The web app is a Progressive Web App. A service worker is generated at
build time (via `@ducanh2912/next-pwa`) with this caching strategy:

| Asset kind | Strategy | TTL |
| ---------- | -------- | --- |
| `/_next/static/*`, `/icons/*`, `/audio/*` | CacheFirst | 30 days |
| Images | CacheFirst | 30 days |
| `/api/*` | NetworkFirst (5s timeout) | 1 day |
| `/<locale>/practice\|/dashboard\|/achievements` | NetworkFirst (3s timeout) | 7 days |
| Other navigations | StaleWhileRevalidate | 1 day |
| `/<locale>/courses\|/practice/roleplay\|/practice/vocab` (es/en) | CacheFirst | 30 days |
| `/` (start_url) | NetworkFirst with opaqueredirect fallback | session |

Offline behaviour: dashboard, course browser, lessons, vocab deck and
SRS review all render from cache. Mutations (SRS review, lesson complete)
queue up via Background Sync and POST when connectivity returns
(currently the queue is an open item — the v0.5 roadmap).

PWA assets are generated from a single SVG source so the icon set stays
in sync (`scripts/generate-pwa-icons.cjs` → favicon.ico, apple-touch-icon,
192/512 PWA icons, 512 maskable). The manifest declares the maskable icon
required by Android adaptive launchers and exposes shortcuts for the
"Practice" and "Dashboard" tiles.

To install on a phone or desktop: open the app in Chrome/Edge, click
"Install" in the address bar.

## Internationalization

10 UI locales are supported through `next-intl`: `es` (default), `en`,
`pt`, `fr`, `de`, `it`, `pl`, `zh`, `ja`, `ar`. Each locale has a full
message catalog in `packages/i18n/src/messages/*.json`.

Content (lessons, episodes, roleplays, vocab) is bilingual in `es`/`en`
by design. Other locales see the Spanish body with their own translated
UI chrome. `ar` gets `dir="rtl"` automatically so the layout mirrors.

Missing keys fall back to the English catalog at request time, so adding
a key to `en.json` without translating it for the other nine languages
will not break the build — it just shows English until translated.

## End-to-end tests (Playwright)

The web app ships 39 E2E tests across 6 spec files. They run against the
production server (built once via `pnpm run build`) and cover the
critical user journeys plus WCAG 2.1 AA conformance with `axe-core`.
All 38 active tests pass deterministically (one is `test.skip`'d when
no lessons are exposed); zero retries required on a cold start.

| Spec                  | Tests | Scope |
| --------------------- | ----- | ----- |
| `smoke.spec.ts`       | 12    | Public pages, redirects, manifest, SW |
| `auth.spec.ts`        | 6     | Register, login, logout, onboarding, protected routes, locale-aware redirects |
| `i18n.spec.ts`        | 7     | Default locale, RTL flip, locale negotiation, all 10 locales reachable |
| `courses.spec.ts`     | 3     | Course index → detail → unit → lesson navigation, mark complete |
| `practice.spec.ts`    | 4     | Practice hub landing + SRS, quiz, vocab deck |
| `a11y.spec.ts`        | 7     | axe-core WCAG 2.1 AA on home, courses, login, register, onboarding, lesson |

**How to run**

```bash
# One-time browser install (Chromium only, 150 MB)
pnpm run test:e2e:install

# Build once, then start the prod server in the background
pnpm run build

# Run all E2E tests
pnpm --filter web test:e2e

# Or a single spec
pnpm --filter web test:e2e:smoke     # 12 fast smoke tests
pnpm --filter web test:e2e:a11y      # axe-core only
```

**Configuration**

- `playwright.config.ts` is the source of truth.
- The webServer runs `pnpm run start` against the **production** build.
  `next dev` corrupts the prerender manifest under Next 15.5 in this
  workspace, so the prod server is the deterministic option.
- 1 retry on local, 2 on CI for cross-page navigation tests.
- `tests/e2e/helpers.ts` provides `registerUser` / `loginUser` / `uniqueEmail`
  so the auth tests go through the real server actions and bcrypt path.

**a11y policy**

- `critical` violations fail the suite.
- `serious` violations are logged but don't block; see
  `tests/e2e/a11y.spec.ts` for the rule list and
  `apps/web/src/app/globals.css` for the contrast tokens.

## Roadmap

| Phase | Status | Highlights |
| ----- | ------ | ---------- |
| 0     | ✅      | Monorepo (Next.js 15 + pnpm workspaces), Biome, Vitest, Playwright, Docker, GH Actions, README grade-A |
| 1     | ✅      | 29 tables (Drizzle), Auth.js v5 + JWT sessions, register/login/onboarding, 3 server actions, 7 tests |
| 2     | ✅      | SRS (FSRS-6), IRT 2PL, gamification (XP/level/streak/rate-limit per kind), achievements engine, 75 tests |
| 3     | ✅      | 106 lessons + 18 labs + 7 projects + 41 achievements migrated from RedLab v6 |
| 4     | ✅      | 30 episodes + 18 roleplays + 5 games + 805 vocab + 10 UI locales from Sprint L2 |
| 5     | ✅      | Course browser (6 pages), MDX lessons, real progress from DB, 10 tests |
| 6     | ✅      | Practice Hub: SRS review, adaptive quiz (placeholder), vocab deck, games hub, roleplay viewer (AI off). Rate limit per-kind (SRS: 200/min) |
| 7     | ✅      | Dashboard real (XP/streak/SRS/progress/achievements), Achievements page, Settings (profile + AI keys + JSON export), 488 real quiz questions imported from RedLab |
| 8-9   | ✅      | 10 UI locales (en/es/pt/fr/de/it/pl/zh/ja/ar) via next-intl; PWA with `@ducanh2912/next-pwa` (CacheFirst/SWR/NetworkFirst), manifest, offline-capable |
| 10    | ✅      | 39 Playwright E2E across 6 specs (smoke, auth, i18n, courses, practice, a11y); axe-core WCAG 2.1 AA on 6 surfaces; 0 lint errors; 0 `serious` a11y violations; 38/38 tests pass deterministically (1 `test.skip` when no lessons exposed) |
| 11    | ✅      | Multi-stage Docker (node:22-alpine + pnpm 9.15); non-root `nextjs` runtime; entrypoint runs idempotent `db:push` then `next start`; healthcheck via `/api/health`; SQLite volume (`academy-data-v2`) persists across restarts; `docker-compose.yml` ships an optional Postgres profile; verified end-to-end on Linux: container `(healthy)`, `curl /api/health` returns 200 OK JSON, `curl /es` renders the home page, image ≈ 2.2 GB |

Next:
- **Phase 11** — Deploy automation (Cloudflare Tunnel) + HOMELAB guide ✅
- **Phase 12** — User import (RedLab v6 / Sprint L2 / Academy backup) ✅
- **Phase 13** — Analytics dashboard & spaced-repetition insights

## Professional Academy program (2026)

Roadmap to Cisco-Academy/Duolingo level on the flagship tracks
(Networking → CCNA, DevOps → CKA/AWS), single-user, with speaking:

| Fase | Status | Highlights |
| ---- | ------ | ---------- |
| 0 | ✅ | Mobile nav + active states, 5 `loading.tsx`, `EmptyState`, breadcrumbs, reading progress, functional demo, onboarding suggestions; 39/39 E2E |
| 1 | ✅ | `path.json` × 2 with validated prereq graph, sequential gating + exam gates ≥80%, FS exam loading with calibrated IRT, recorded attempts, SRS remediation loop; 40/40 E2E |
| 2 | ✅ | Networking 12→30 lessons (all with quiz), DevOps 40/40 quizzes, executable lab validations + definition-of-done cards, 2 capstone projects, project loader fix |
| 3 | ✅ | Timed exam runner (pass/fail, review, adaptive SE stop), BKT skill mastery + heatmap + next-step, `db:calibrate` script; 41/41 E2E |
| 4 | ✅ | 20 episodes completed (quiz/SRS/follow-ups), interactive episode viewer (quiz/speak/vocab tabs), Web Speech speaking scores, audio-first listening, daily goal; 44/44 E2E |
| 5 | ✅ | a11y hardening, dynamic imports, 10-locale offline caching, downloadable path study guides (`/api/paths/:id/guide`); 341 unit + 44 E2E green |

## User data migration

Bring progress, SRS cards, achievements, and activity from **RedLab v6**
or **Sprint L2** into Academy. Passwords are not migrated — you sign in
to Academy with your Academy credentials.

```bash
# 1. Export from your old app
# RedLab v6: Settings → Export (downloads redlab-export.json)
# Sprint L2: pnpm tsx scripts/sprint-l2-export.ts --db ./sprint-l2.db > sprint-l2-export.json

# 2. Sign in to Academy and open /settings/import
# 3. Upload the JSON file
```

All inserts are idempotent (re-running with the same file is a no-op).
For full documentation, see [`docs/MIGRATION.md`](./docs/MIGRATION.md).

## Contributing

Pull requests welcome. Run `pnpm run lint` and `pnpm run test:unit` before opening one. Commits must follow [Conventional Commits](https://www.conventionalcommits.org) (enforced via commitlint + Husky).

## License

[MIT](./LICENSE) — free to use, modify, and self-host, with or without attribution changes. See the file for the full text.
