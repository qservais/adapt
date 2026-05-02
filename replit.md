# ADAPT by LMJ — Workspace

## Project Overview

Full-stack fitness coaching app. Athletes submit a daily check-in (sleep/energy/stress/soreness/motivation sliders) that generates an **ADAPT Score** (0-100), which determines their session mode (performance/normal/adapt/recovery) and adapts training loads accordingly. Coaches monitor athletes, manage training programs with 4 variant modes, handle alerts, and message athletes.

## Design System (NON-NEGOTIABLE)

- Background: `#0A0A0A` (dark electric)
- Neon green accent: `#00F5A0` (performance/normal)
- Cyan: `#00D9FF`
- Amber: `#FFB800` (ADAPT mode)
- Red: `#FF3B5C` (RECOVERY mode)
- Violet: `#7B61FF` (PERFORMANCE mode overlay)
- Fonts: Bebas Neue (titles) + DM Sans (body) + Space Mono (scores/numbers)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec — generates 795-line Zod + 3057-line React Query client)
- **Mobile**: Expo (React Native) — Task #2
- **Coach dashboard**: React + Vite — Task #3

## Bilingual FR/EN (i18n)

ADAPT is fully bilingual French / English across all 4 artifacts.

- **Default language**: French. Detection order = `localStorage('adapt_lang')` → `navigator.language` → `fr` fallback.
- **Web (landing + coach-dashboard)**: `i18next` + `react-i18next` + `i18next-browser-languagedetector`. Init in `src/lib/i18n.ts`. Strings in `src/locales/fr.json` and `src/locales/en.json` (matching keyspaces).
- **Mobile (athlete-app)**: custom system via `useT()` hook from `context/PreferencesContext.tsx`. The `TRANSLATIONS` object holds `fr` and `en` sections with matching keys. Language is persisted to backend (`users.language`) and reapplied on auth restore.
- **API server**: `localeMiddleware` (`src/middleware/i18n.ts`) wired in `src/app.ts` reads `Accept-Language` then `req.user.language`. Auth emails (welcome / password reset) accept and use the recipient's language for FR/EN templates.
- **Language switchers**:
  - Landing: `<LanguageSwitcher compact />` in nav (LandingPage) and PrivacyPage
  - Coach Dashboard: `<LanguageSwitcher />` in `pages/settings/index.tsx` "Langue de l'interface" section + persists to `/users/me/profile`
  - Athlete App: lang segmented control in `components/profile/ExtendedProfileSections.tsx` (lines 917-938) — saves via `usePreferences().setLanguage` then PUT profile
- **Pages translated** (coach-dashboard): app-sidebar, dashboard, clients/index, programs/index, library/index, content/index, messages/index, notifications/index, alerts/index, challenges/index, settings/index, auth pages (login, forgot, reset)
- **Athlete screens translated**: dashboard (tabs/index), session, profile, checkin, auth/login, auth/register, onboarding/{goal,fitness,profile}, components/home/{ChallengeCard,WeekCalendar}

## Completed Features (Tasks)
- **Task #26**: Daily step counter (`daily_steps` DB table, `GET/POST /stats/steps`, `GET/PUT /users/me/stats-order`), `StepsSection` component with bar chart (7/14/30d) + manual entry modal. `DraggableSectionList` using `PanResponder` for drag-and-drop section reordering — long-press activates mode, drag handles visible per section, hover indicator shown, order persisted to DB. Migration: `lib/db/migrations/0020_task26_steps_stats_order.sql`.

## Task #56: "Faire maintenant" — Launch Exercise from Library
- **New athlete API endpoints** in `exercises.ts`:
  - `GET /api/athlete/exercises` — returns exercises from athlete's active program (falls back to all public exercises)
  - `GET /api/athlete/exercises/:exerciseId` — exercise detail with last 10 performance logs for the athlete
  - `POST /api/athlete/exercises/:exerciseId/do-now` — creates a `isFreeSession` session log and returns FreeSessionData payload with defaults (3 sets × 10 reps, 90s rest, last used load)
- **New screen** `app/library/exercise/[id].tsx` — Exercise detail page with: category, level, muscle groups, equipment, description, demo modal, performance history (HISTORIQUE), sticky "Faire maintenant" CTA
- **Library index** (`app/library/index.tsx`) — Added "MES EXERCICES" section listing program exercises as tappable cards; paginated (first 5, expand all)
- **freeSessionStore.ts** — Added `completedExercises: CompletedExerciseEntry[]` field and `addCompletedExercise()` helper
- **free-exercise.tsx** — Calls `addCompletedExercise()` in `handleExerciseDone()` with final load and sets
- **free-complete.tsx** — Sends `completedExercises` to `POST /sessions/:sessionLogId/complete` so exercise logs land in `exercise_logs` table
- Reuses existing `free-exercise.tsx` + `free-complete.tsx` session flow for execution

## Completed Features (Tasks) cont.
- **Task #38**: Timezone fix — `getLocalDayNumber()` and `dateDiffDays()` helpers added to `lib/dateUtils.ts` using `"T12:00:00Z"` suffix trick (avoids UTC midnight boundary issues for Europe/Brussels). `/sessions/today` rewrites to `getOrCreateTodaySessionLogs()` — creates a session log for EVERY session scheduled on the current day, returns the first uncompleted one. API response now includes `sessionsToday`, `sessionsTodayCompleted`, `sessionIndex`. Home screen shows "SÉANCE X/Y" badge when multiple sessions exist; done card handles multi-session messaging. `/sessions/missed` also fixed for local dates.
- **Task #39**: `sharp` native addon fixed — added `pnpm.onlyBuiltDependencies: ["sharp"]` to root `package.json`; `pnpm install` now builds the sharp native addon successfully (verified `sharp@0.34.5` loads from api-server workspace).

## Task #42: Avatar Upload Fix, Barcode Scanner, RPE Retroactive
- **Avatar upload**: Removed `makePublic()` call (fails on Replit GCS sidecar ACLs). Now stores the GCS object name (e.g. `avatars/{userId}-{timestamp}.jpg`) in `avatarUrl` DB column. A public `GET /api/users/avatar/:userId` endpoint reads from GCS and streams the image. `resolveAvatarUrl()` helper in users.ts and coach.ts converts stored object names to API URLs.
- **Barcode scanner**: Added `active` prop to `CameraView` (pauses when modal closes), `onCameraReady` callback with loading overlay, and `cameraReady` state for clean lifecycle management.
- **RPE retroactive**: New `session/rate.tsx` screen accepts `sessionLogId` + `sessionName` params. "Évaluer" button shown on completed session cards without RPE (home screen SessionCard + SessionDoneCard + history screen). Uses existing `POST /sessions/:sessionId/feedback` API. `SessionDetail` type now includes `rpe` and `perceivedDifficulty` fields returned from `buildSessionDetail()`.

## Key Implementation Notes

- Express 5 `req.params` returns `string | string[]` — always use `String(req.params["x"])` pattern
- JWT secrets throw loudly in production if `JWT_SECRET` / `JWT_REFRESH_SECRET` are not set
- ADAPT engine is server-side only — never recalculate on the client
- Check-in window closes at 14:00 UTC → 422 `CHECKIN_WINDOW_CLOSED`
- Pain in check-in → forces RECOVERY mode + P1 alert
- `POST /coach/clients/link` links an athlete by email to the coach's roster
- `POST /athlete/link` links an athlete to a coach by invite code
- `POST /sessions/:sessionId/feedback` allows an athlete to submit RPE + perceived difficulty for a completed session log
- `PUT /programs/:programId/sessions/:sessionId` verifies both program ownership (coach) AND session belongs to that program before updating (IDOR-safe)
- All UUID params are validated via regex before DB queries to avoid Postgres type errors
- Seed: 4-week program × 3 sessions/week = 12 sessions; each session × 4 variants; load progression +5%/week

## Structure

```text
adapt-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server (COMPLETE)
│   ├── athlete-app/        # Expo mobile app (Task #2 pending)
│   └── coach-dashboard/    # React+Vite coach web app (Task #3 pending)
├── lib/
│   ├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/
│       └── seed.ts         # DB seed script (demo data)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Backend (Task #1 — COMPLETE)

### API Server (`artifacts/api-server`)

Express 5 API with helmet, pino logging, rate-limiting (200 req/min general, 20/min auth).

**Routes mounted at `/api`:**
- `GET /api/healthz` — health check
- `POST /api/auth/register` — register coach or athlete
- `POST /api/auth/login` — login → returns accessToken + refreshToken
- `POST /api/auth/refresh` — refresh access token
- `POST /api/auth/logout` — invalidate refresh token
- `GET /api/users/me` — get own profile
- `PATCH /api/users/me` — update profile
- `POST /api/checkins` — submit daily check-in (closes at 14:00 UTC → 422)
- `GET /api/checkins/today` — get today's check-in
- `GET /api/checkins/history` — check-in history (athlete)
- `GET /api/sessions/today` — get today's adapted session (requires check-in)
- `POST /api/sessions/:sessionId/complete` — log completed session
- `GET /api/programs` — list athlete's programs
- `GET /api/programs/:id` — get program detail
- `POST /api/programs` — create program (coach only)
- `PATCH /api/programs/:id` — update program (coach only)
- `GET /api/coach/clients` — list coach's athletes with today's status
- `GET /api/coach/clients/:clientId` — single athlete detail
- `DELETE /api/coach/clients/:clientId` — remove athlete
- `GET /api/coach/clients/:clientId/checkins` — athlete check-in history
- `POST /api/coach/clients/:clientId/override` — override athlete mode
- `GET /api/coach/dashboard` — operational dashboard (todayAthletes, upcomingSessions 7d, pastSessions 7d, recentCompleted, activeAlerts)
- `GET /api/coach/calendar?year=YYYY&month=M` — all athletes' sessions for a given month (grouped by date)
- `GET /api/coach/alerts` — get all active alerts
- `PUT /api/coach/alerts/:alertId/resolve` — resolve alert
- `GET /api/coach/invite-code` — get coach's invite code
- `POST /api/coach/clients/link` — link athlete by invite code (coach flow)
- `POST /api/athlete/link` — link to coach by invite code (athlete flow)
- `GET /api/exercises` — list exercises
- `POST /api/exercises` — create exercise (coach only)
- `GET /api/messages` — list message threads
- `GET /api/messages/:userId` — get conversation
- `POST /api/messages` — send message
- `PUT /api/messages/:userId/read` — mark messages as read
- `GET /api/sessions/history` — session history (athlete, 30 days) including enriched fields: sessionName, durationMin, athleteNotes, exercises (exerciseId, exerciseName, loadKgUsed, setsCompleted)
- `GET /api/athlete/upcoming-sessions` — upcoming sessions for next 7 days from athlete's active program (UpcomingSession[])
- `GET /api/athlete/tests` — athlete's performance tests sorted by testedAt DESC (AthletePerformanceTest[])

**Services:**
- `adapt-engine.ts` — `calculateAdaptScore()` + `calculateAdaptedLoad()` (server-side only)
- `alert-job.ts` — daily cron at 09:00 checking for: inactivity (3 days), low scores (<25 for 2 days), high RPE (ALC-01), fatigue/soreness ≥4/5 for 2+ consecutive days (ALC-02)

### Database Schema (`lib/db`)

Tables: users, programs, sessions, session_variants, exercises, session_exercises, checkins, session_logs, exercise_logs, alerts, messages, notifications, personal_records, performance_tests

**performance_tests**: athlete_id (FK), coach_id (FK), test_type (varchar 50), exercise_id (nullable FK), exercise_name, value (decimal), unit, tested_at (date), notes, created_at

**Push schema:** `pnpm --filter @workspace/db run push`

### ADAPT Engine Logic

- **Score**: sleep×0.25 + energy×0.20 + (1-stress)×0.15 + (1-soreness)×0.20 + motivation×0.20 → ×100
- **≥80** → PERFORMANCE (violet, +2.5% loads)
- **60-79** → NORMAL (green, baseline)
- **40-59** → ADAPT (amber, -22.5% loads, -20% volume)
- **<40** → RECOVERY (red, -50% loads/volume)
- Pain → forces RECOVERY + P1 alert immediately
- RPE modifier: yesterday RPE ≥9 → -5pts; <5 → +3pts
- Cycle phase modifier: luteal → -5pts

### Seed Script

```bash
pnpm --filter @workspace/api-server run seed
```

Two-step idempotent seed:
1. `seed.sql` — base data (coach + Owen + 97 exercises + Owen's programs)
2. `seed-patch.sql` — 6 demo athletes (Sara, Tom, Marie, Julien, Quentin×2) + their 4 programs + 52 sessions + 208 variants + 1248 session_exercises

Both files use `ON CONFLICT (id) DO NOTHING` — safe to run multiple times.

Demo accounts (all password: `Demo1234!`):
- Coach: `coach@adapt.demo` (invite code: MARC01)
- Julien: `julien@adapt.demo` (scores 60-82, normal/performance)
- Sara: `sara@adapt.demo` (scores 80-100, performance)
- Tom: `tom@adapt.demo` — P1 pain alert (knee, RECOVERY forced)
- Marie: `marie@adapt.demo` — P2 inactivity alert (3 days no check-in)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Use `pnpm run typecheck` from root to build all project references. Always use `tsx` for running scripts in dev.

## Important Notes

- **Zod imports**: route files use `"zod"` (v3 via catalog); DB schema uses `"zod/v4"` 
- **UUID defaults**: `sql\`gen_random_uuid()\`` in schema (not `.defaultRandom()`)
- **JWT secrets**: `JWT_SECRET` and `JWT_REFRESH_SECRET` env vars (defaults to dev values if missing)
- **ADAPT Engine**: server-side ONLY, never recalculate on client
- **Check-in window**: closes at 14:00 UTC (returns 422 `CHECKIN_WINDOW_CLOSED`)
