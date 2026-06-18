# Dicta (Local MVP)

## Frontend Stylesheet Architecture

Dicta runtime CSS is fully modularized.

- `src/App.css` is intentionally a tiny stylesheet entrypoint. It should only import `src/styles/index.css`.
- `src/styles/index.css` is the ordered cascade manifest for runtime CSS modules.
- Feature, shell, dashboard, admin, leaderboard, training, workspace, sidebar, transcript, status, adaptive, and responsive styles live in focused files under `src/styles/`.
- New runtime styles should go into the closest existing module, or into a new focused module imported through `src/styles/index.css` in cascade order.
- Do not add component or feature CSS back into `src/App.css`.
- Preserve import order deliberately. Many modules were extracted from the former monolithic `App.css`; order is part of the UI contract.

For the extraction history and follow-up guardrails, see `docs/modularization-roi.md` and `docs/app-shell-modularization-map.md`.


Real-time, adaptive dictation trainer. Dicta runs locally (Vite + React) and adapts pace, chunking, replay support, and perceptual pauses based on how you type, what language you are practicing, and what the current input mode can actually execute.

## Required Reading Before Changes

Before proposing or making code changes, read these files in order:

1. `AGENTS.md` for repo rules, guardrails, and the required change workflow.
2. `README.md` for product terminology, deployment assumptions, and current access/security model.
3. `docs/architecture.md` for topology, data flow, runtime boundaries, and known gaps.
4. `docs/listening-first-architecture.md` for the listening-first score/policy model, Precision/Stabilize/Challenge terminology, and legacy compatibility matrix.

After reading them, propose changes from the architecture. Do not start from an isolated file edit. A proposal should identify the affected boundary: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar. If the change touches adaptive behavior, it must also identify the affected `(inputMode, language)` profile and explain how neighboring profiles stay unchanged.

If a change updates behavior, keep `AGENTS.md`, `README.md`, and `docs/architecture.md` aligned.

## Modular Docs

- [Documentation index](docs/README.md)
- [Architecture map](docs/architecture.md)
- [Listening-first architecture](docs/listening-first-architecture.md)
- [Adaptive listening brain](docs/adaptive-listening-brain.md)

## Product Overview

Dicta is an invite/admin-managed dictation trainer for practicing listening and typing with **Browser TTS x 5 languages**.

Languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

Input modes:

- Browser TTS / `browser-tts`: browser `SpeechSynthesis`, adaptive semantic chunking, and browser/OS voice behavior.

The Adaptive Pace Layer is the shared brain. Every benchmark, telemetry stream, recommendation, and session feedback package is scoped by `(inputMode, language)`, so `browser-tts/de` and `browser-tts/en` are different adaptive profiles. The adaptive benchmark rolling window is **30 days** (`rollingWindowDays: 20`), and dashboard/leaderboard "Month" views also mean the last 20 days.

Saved completed/error sessions also have a **20-day retention window** based on last activity (`telemetry.finishedAt`, then `updatedAt`, then `createdAt`). Dicta prunes older completed/error session payloads from localStorage and syncs Supabase tombstones so other devices do not restore them. Pending or active `ready`, `running`, and `paused` sessions are preserved. This saved-session retention is separate from the benchmark timeline: the benchmark remains a rolling 20-day adaptive telemetry profile, not a complete saved-session history.

`ListeningTrainerPolicy` is the central pedagogical layer for next-session generation. It takes the current profile-specific benchmark, latest matching feedback, and user intent, then produces a `ListeningTrainingPrescription` for listening comprehension. User-facing training intents are `Precision`, `Stabilize`, and `Challenge`; internal storage and job contracts still use historical values like `easy`, `normal`, `hard`, and legacy slot labels. Legacy one-minute express jobs and sessions remain readable, but express is no longer a separate visible mode: Training Mode buttons, leaderboard sections, OpenRouter notices, and notifications group them into `Precision`, `Stabilize`, or `Challenge`. See `docs/listening-first-architecture.md` before changing this mapping. This is the main future iteration point for training quality; it must not mix benchmarks across inputs or languages.

Listening Cycle V3 treats Dicta as listening and reconstruction training, not a speed race. The active Browser TTS controller now runs a continuous adaptive listening brain in shadow/reporting plus runtime pacing: telemetry is normalized, a universal sample-quality gate decides benchmark/insight/runtime-pressure use, a pressure vector is computed, and `adaptiveLevel` maps independently to rate, pause, phrase size, boundary strictness, and replay support. Recommendation and prescription handling can represent the broad product pace envelope of `0.1-2.0`, while Browser TTS execution still applies runtime and voice-calibration safety caps before calling `SpeechSynthesis`. Pauses are first-class: `perceptualPause` can raise `pauseMsTarget` without forcing the playback rate down. The legacy `support/recovery/balanced/flow` labels remain readable/debuggable but are derived compatibility labels, not the runtime motor. Adaptive user/system reports use schema v3 with a top-level `listeningCycleV3` block that separates listening segmentation, reconstruction, typing mechanics, TTS environment constraints, continuous adaptive state, sample quality, calibration, and requested-vs-actual playback execution.

## Access and Security Model

Current access model:

- Dicta uses invite/admin-created Supabase email/password users. There is no public self-signup flow in this repo.
- Admin profiles can manage members, OpenRouter access, assigned free OpenRouter models, and member session limits.
- Member profiles default to a 15-session limit, no OpenRouter access, and only their own synced rows.
- Hosted and PWA access must go through Supabase Auth + RLS; the old single-password app gate has been removed.
- Local and remote verification can use the Supabase E2E test account defined by `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and `E2E_TEST_PROFILE_ID` in `.env.local` or the secure execution environment. Keep the password out of committed docs, source, screenshots, and logs.

Server-only secrets:

- `OPENROUTER_API_KEY` is server-only.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be referenced from Vite/client code, `src/`, or `public/`.
- CI fails if `SERVICE_ROLE_KEY` appears in `src/` or `public/`.

## Stack

- React + TypeScript + Vite
- Rule-based sync controller + adaptive pacing layer
- Supabase Auth/RLS for multiuser sync and admin/member access
- Vercel server routes for OpenRouter and admin APIs
- Local Python ingestion CLI and local-only TTS sidecars

## Quick Start

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run test
npm run build
npm run test:e2e:mobile
```

## Vercel Deployment

Dicta can be deployed to Vercel as a static Vite app with lightweight API routes:

- Browser TTS works in the hosted app and keeps using browser `localStorage`.
- OpenRouter generation works through `/api/openrouter/models`, `/api/openrouter/chat`, and `/api/openrouter/jobs` when `OPENROUTER_API_KEY` is configured server-side.
- Hosted public beta access uses Supabase Auth (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) plus RLS.

Set OpenRouter in Vercel before using hosted generation:

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_API_KEY preview
```

For Supabase-backed OpenRouter jobs and admin user management, also set this server-side only:

```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
```

Set public Vite Supabase vars locally and in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SYNC_PROFILE_ID`
- `VITE_DICTA_AUTH_REDIRECT_ORIGIN`
- `VITE_DICTA_APP_ORIGIN`

Set `VITE_DICTA_AUTH_REDIRECT_ORIGIN` to the public canonical Dicta app origin in production so Supabase password recovery emails do not send members to protected Vercel preview/deployment URLs. Supabase Auth URL Configuration must allow the resulting `${VITE_DICTA_AUTH_REDIRECT_ORIGIN}/training` redirect URL.

Set `VITE_DICTA_APP_ORIGIN` to the public canonical Dicta app origin in production so in-app navigation from preview deployments returns to production instead of staying on the preview host.

Set `VITE_DICTA_APP_ORIGIN` to the public canonical Dicta app origin in production so in-app training navigation such as the `Home` button returns users to production instead of the current preview deployment.

Optional local-only verification vars:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`
- `E2E_TEST_PROFILE_ID`
