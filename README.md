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
- [Storage architecture](docs/storage-architecture.md)
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

The Adaptive Pace Layer is the shared brain. Every benchmark, telemetry stream, recommendation, and session feedback package is scoped by `(inputMode, language)`, so `browser-tts/de` and `browser-tts/en` are different adaptive profiles. The adaptive benchmark rolling window is **20 days** (`rollingWindowDays: 20`), and dashboard/leaderboard 20-day views also mean the last 20 days.

There is no Adaptive Pace Layer cockpit/dashboard tab. Adaptive learning data remains internal and continues to feed Training Mode, OpenRouter generation context/export behavior, Live Metrics diagnostics, IndexedDB persistence, and Supabase sync. The remaining Adaptive Pace Layer workspace is the Flow view: it is primarily an implementation map, and Phase 1 / Generation owns the live direct OpenRouter Generate Training Session card. Its 2-10 minute selector controls the locally persisted browser preference reflected by the Training Mode direct generation buttons and their help text.
Each Training Mode direct generation click is tracked as its own OpenRouter job log row with elapsed time; active rows expose cancel so a stalled generation can be removed from polling and marked canceled server-side. Durable OpenRouter jobs abort provider waits before the 300-second Vercel function window, and stale `queued`/`running` rows older than that window are marked failed on the next poll so Training Mode does not show an infinite elapsed timer. Direct OpenRouter generation requests compact `title` + `chunks` JSON by default, then Dicta locally builds the full `DictationScript`, so 2-10 minute word and token budgets scale with spoken text instead of repeated phrase metadata.

Saved completed/error sessions also have a **20-day retention window** based on last activity (`telemetry.finishedAt`, then `updatedAt`, then `createdAt`). Dicta prunes older completed/error session payloads from IndexedDB active storage and syncs Supabase tombstones so other devices do not restore them. Pending or active `ready`, `running`, and `paused` sessions are preserved. This saved-session retention is separate from the benchmark timeline: the benchmark remains a rolling 20-day adaptive telemetry profile, not a complete saved-session history.
Supabase tombstones are kept for **30 days**. A client whose last successful sync is older than that tombstone window must full-refresh before it can push local rows, which prevents old local payloads from resurrecting deleted or expired records.

Large local working-copy payloads live in IndexedDB, not `localStorage`. `localStorage` is reserved for small manifests, profile pointers, and preferences. See [Storage architecture](docs/storage-architecture.md).

`ListeningTrainerPolicy` is the central pedagogical layer for next-session generation. It takes the current profile-specific benchmark, latest matching feedback, and user intent, then produces a `ListeningTrainingPrescription` for listening comprehension. User-facing training intents are `Precision`, `Stabilize`, and `Challenge`; internal storage and job contracts still use historical values like `easy`, `normal`, `hard`, and legacy slot labels. Legacy one-minute express jobs and sessions remain readable, but express is no longer a separate visible mode: Training Mode buttons, leaderboard sections, OpenRouter notices, and notifications group them into `Precision`, `Stabilize`, or `Challenge`. See `docs/listening-first-architecture.md` before changing this mapping. This is the main future iteration point for training quality; it must not mix benchmarks across inputs or languages.

Listening Cycle V3 treats Dicta as listening and reconstruction training, not a speed race. The active Browser TTS controller now runs a continuous adaptive listening brain in shadow/reporting plus runtime pacing: telemetry is normalized, a universal sample-quality gate decides benchmark/insight/runtime-pressure use, a pressure vector is computed, and `adaptiveLevel` maps independently to rate, pause, phrase size, boundary strictness, and replay support. Recommendation and prescription handling can represent the broad product pace envelope of `0.1-2.0`, while Browser TTS execution still applies runtime and voice-calibration safety caps before calling `SpeechSynthesis`. Pauses are first-class: `perceptualPause` can raise `pauseMsTarget` without forcing the playback rate down, but learner-facing safe-boundary pauses are learner-paced rather than guaranteed waits. Training Mode shows one editable safe phrase chunk at a time; its `Replay chunk` action restarts Browser TTS at that chunk's exact source-word boundary, submitted chunks and future text stay hidden during practice, unsafe internal TTS slices continue automatically inside the current visible chunk, and the existing scoring text remains cumulative behind the scenes. Submitted chunks reappear only in the final submitted review with aggregate and per-chunk stats. After a safe chunk finishes speaking, Browser TTS waits until the learner selects `Submit / Check` or `Skip chunk`, then honors the default 700 ms mental rest before starting the next chunk. Correct typing alone and elapsed timeout do not advance chunk practice; the final chunk requires `Finish session` instead of auto-submitting. The 4000 ms anti-blocking fallback remains for internal non-practice completion gates, not learner-facing chunk practice. During that safe inter-chunk pause, Dicta may copy punctuation from the original script into the active cumulative practice text after a short idle window; if the cursor or recent typing makes that unsafe, punctuation stays pending for pause, stop, blur, or submit. Punctuation remains non-scoring: points and accuracy are still word-match based. Those execution defaults are editable as local browser preferences from Adaptive Pace Layer Flow Step 5 / Playback loop. Benchmark pause telemetry separates `requestedPauseMs` from resolved `actualPauseMs`, and records whether the completion gate ended by `completed`, `submitted`, `timeout`, or `no-gate`; completed session payloads can also include optional per-practice-chunk ranges and resolution metadata in IndexedDB/Supabase JSON. The minimum mental rest only applies to safe pauses, not unsafe or incomplete semantic cuts. The legacy `support/recovery/balanced/flow` labels remain readable/debuggable but are derived compatibility labels, not the runtime motor. Adaptive user/system reports use schema v3 with a top-level `listeningCycleV3` block that separates listening segmentation, reconstruction, typing mechanics, TTS environment constraints, continuous adaptive state, sample quality, calibration, and requested-vs-actual playback execution.

During active chunk practice, Training Mode hides the separate Media player card and places `Play` beside the chunk-local replay and submit/skip controls. Selecting `Play` uses the existing Browser TTS command and returns focus to the active chunk textarea. Outside active chunk practice, the standard Media player card remains available.

## Access and Security Model

Current access model:

- Dicta uses invite/admin-created Supabase email/password users. There is no public self-signup flow in this repo.
- Admin profiles can manage members, OpenRouter access, assigned free OpenRouter models, and member session limits.
- Member profiles default to a 15-session limit, no OpenRouter access, and only their own synced rows.
- Hosted and PWA access must go through Supabase Auth + RLS; the old single-password app gate has been removed.
- OpenRouter configuration is nested under Admin at `/admin/openrouter`; the top-level app header links to Admin, then Admin exposes OpenRouter as a subtab.
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
