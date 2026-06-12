# Dicta (Local MVP)

## Frontend Stylesheet Architecture

Dicta runtime CSS is fully modularized.

- `src/App.css` is intentionally a tiny stylesheet entrypoint. It should only import `src/styles/index.css`.
- `src/styles/index.css` is the ordered cascade manifest for runtime CSS modules.
- Feature, shell, dashboard, admin, leaderboard, training, workspace, sidebar, transcript, status, adaptive, and responsive styles live in focused files under `src/styles/`.
- New runtime styles should go into the closest existing module, or into a new focused module imported through `src/styles/index.css` in cascade order.
- Do not add component or feature CSS back into `src/App.css`.
- Preserve import order deliberately. Many modules were extracted from the former monolithic `App.css`; order is part of the UI contract.

For the extraction history and follow-up guardrails, see `docs/next-modularization-plan.md`.


Real-time, adaptive dictation trainer. Dicta runs locally (Vite + React) and adapts pace, chunking, and recovery behavior based on how you type, what language you are practicing, and what the current input mode can actually execute.

## Required Reading Before Changes

Before proposing or making code changes, read these files in order:

1. `AGENTS.md` for repo rules, guardrails, and the required change workflow.
2. `README.md` for product terminology, deployment assumptions, and current access/security model.
3. `docs/architecture.md` for topology, data flow, runtime boundaries, and known gaps.
4. `docs/listening-first-architecture.md` for the listening-first score/policy model, Precision/Stabilize/Challenge terminology, and legacy compatibility matrix.

After reading them, propose changes from the architecture. Do not start from an isolated file edit. A proposal should identify the affected boundary: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar. If the change touches adaptive behavior, it must also identify the affected `(inputMode, language)` profile and explain how neighboring profiles stay unchanged.

If a change updates behavior, keep `AGENTS.md`, `README.md`, and `docs/architecture.md` aligned.

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

The Adaptive Pace Layer is the shared brain. Every benchmark, telemetry stream, recommendation, and session feedback package is scoped by `(inputMode, language)`, so `browser-tts/de` and `browser-tts/en` are different adaptive profiles. The adaptive benchmark rolling window is **30 days** (`rollingWindowDays: 30`), and dashboard/leaderboard "Month" views also mean the last 30 days.

`ListeningTrainerPolicy` is the central pedagogical layer for next-session generation. It takes the current profile-specific benchmark, latest matching feedback, and user intent, then produces a `ListeningTrainingPrescription` for listening comprehension. User-facing training intents are `Precision`, `Stabilize`, and `Challenge`; internal storage and job contracts still use historical values like `easy`, `normal`, `hard`, and legacy slot labels. See `docs/listening-first-architecture.md` before changing this mapping. This is the main future iteration point for training quality; it must not mix benchmarks across inputs or languages.

## Access and Security Model

Current access model:

- Supabase deployments use invite/admin-created email/password users. There is no public self-signup flow in this repo.
- Admin profiles can manage members, OpenRouter access, assigned free OpenRouter models, and member session limits.
- Member profiles default to a 15-session limit, no OpenRouter access, and only their own synced rows.
- Local/dev or non-Supabase deployments can use `DICTA_APP_PASSWORD` and `public/login.html` as a private fallback only.
- For public beta deployment, use Supabase Auth + RLS. Do not rely on `DICTA_APP_PASSWORD` as the primary public access model.
- Local and remote verification can use the Supabase E2E test account defined by `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and `E2E_TEST_PROFILE_ID` in `.env.local` or the secure execution environment. Keep the password out of committed docs, source, screenshots, and logs.

Server-only secrets:

- `OPENROUTER_API_KEY` is server-only.
- `OLLAMA_API_KEY` is server-only.
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
- Ollama Cloud testing works through `/api/ollama/models` and `/api/ollama/chat` when `OLLAMA_API_KEY` is configured server-side.
- Hosted public beta access should use Supabase Auth (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) plus RLS.

Set OpenRouter in Vercel before using hosted generation:

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_API_KEY preview
```

Set Ollama Cloud in Vercel before using the Ollama workspace:

```bash
vercel env add OLLAMA_API_KEY production
vercel env add OLLAMA_API_KEY preview
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

Optional local-only verification vars:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`
- `E2E_TEST_PROFILE_ID`

Use these only to sign into the invite/admin-created Supabase test account during local or hosted app checks. They are not Vite vars and must not be exposed to browser code.

Vercel note: `VITE_*` env vars are baked in at build time. After changing them, redeploy before mobile/PWA clients see the new configuration.

## Supabase Setup

Multiuser auth and sync use:

- `dicta_app_profiles`
- `dicta_sync_items`
- RLS helper functions from `supabase/migrations/20260519000000_dicta_multiuser_auth.sql`

OpenRouter server-side security uses:

- `dicta_openrouter_jobs`
- `dicta_rate_limits`
- `dicta_check_rate_limit(...)`
- `dicta_security_events`

Apply `docs/supabase-openrouter-jobs.sql` before enabling hosted OpenRouter generation. The production Supabase project `Dicta` has had the rate-limit migration `add_openrouter_rate_limits` and the security-event migration `add_security_events_for_openrouter` applied.

## OpenRouter

OpenRouter is used only for generating structured dictation scripts. It is not a playback engine, and the browser must never receive an OpenRouter API key.

Routes:

- `GET /api/openrouter/models`: lists OpenRouter models through the server key.
- `POST /api/openrouter/chat`: immediate chat completion path, 290-second timeout.
- `POST /api/openrouter/jobs`: durable job creation for mobile/long requests.
- `GET /api/openrouter/jobs?id=...`: durable job polling.

Server-side rules:

- Accepted model ids are `openrouter/free` or ids ending in `:free`.
- Prompt length is capped at 32,000 characters.
- Immediate chat `maxTokens` is bounded between 128 and 1,800.
- Durable job `maxTokens` is bounded between 128 and 4,800, with defaults sized by requested session duration.
- `resolveRequestProfile`, `assertOpenRouterAccess`, and `assertOpenRouterModelAllowed` gate access per signed-in profile.
- `/api/openrouter/chat` and `/api/openrouter/jobs` are rate-limited per profile through `dicta_check_rate_limit`.
- Durable jobs use `dicta_openrouter_jobs`, `waitUntil`, a 3 active-job limit, and cleanup of completed jobs older than 14 days.
- Rate-limit exceedance writes a security event to logs and, when a Supabase service client is available, `dicta_security_events`.

Default OpenRouter rate limits:

- Members chat: `DICTA_OPENROUTER_MEMBER_CHAT_PER_HOUR=30`
- Admins chat: `DICTA_OPENROUTER_ADMIN_CHAT_PER_HOUR=180`
- Members jobs: `DICTA_OPENROUTER_MEMBER_JOBS_PER_HOUR=20`
- Admins jobs: `DICTA_OPENROUTER_ADMIN_JOBS_PER_HOUR=120`

If the rate-limit RPC is missing or broken, hosted OpenRouter routes must fail closed instead of accepting public beta requests without rate limiting.

## Ollama Cloud

Ollama Cloud is added as a separate model gateway workspace for testing chat prompts. It does not replace OpenRouter generation and does not create DictationScript sessions.

Routes:

- `GET /api/ollama/models`: lists Ollama Cloud models through the server key.
- `POST /api/ollama/chat`: sends a non-streaming chat test through the server key.
- `GET /api/ollama/key/status`: reports whether `OLLAMA_API_KEY` is configured without exposing the key.

Server-side rules:

- `OLLAMA_API_KEY` is server-only.
- Accepted model ids must match `/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/`.
- The initial recommended model is `gemma3:27b-cloud`.
- Ollama models do not use `:free`; access and quota depend on the Ollama account tier.
- Upstream `429` responses are shown as likely rate/quota limits, and `401`/`403` responses are shown as auth/plan/access issues.

## Typical Training Flow

2. Provide content:
   - Browser TTS: provide text; Dicta chunks it into semantic phrases.
   - OpenRouter mode: generate structured scripts for the selected `(inputMode, language)` using current benchmark context and the trainer prescription.
3. Start a session and type what you hear.
4. The input adapter publishes live telemetry.
5. The Adaptive Pace Layer decides rate, pause, chunking, recovery, and phrase-size actions.
6. The active input engine applies what it can.
7. Dicta stores local session state and optionally syncs profile-scoped rows to Supabase.

## Adaptive Pace Layer

The Adaptive Pace Layer is the central control loop. It takes live signals from the current session, combines them with historical profile/benchmarks, respects semantic phrase boundaries, and outputs executable pacing decisions.

At a high level:

1. Normalize live session telemetry into a `LiveTelemetryFrame`.
2. Load/update the 30-day rolling benchmark for `(inputMode, language)`.
3. Use the historical profile and current input capabilities to decide pacing.
4. Apply rate/pause/replay/chunk controls where supported.
5. Persist timeline/metrics and session feedback.

Important rules:

- Treat each `(inputMode, language)` as its own profile.
- Do not share fixes across profiles unless the task explicitly requires it.
- Direct mobile generation buttons express listening intent (`Precision`, `Stabilize`, `Challenge`) rather than absolute difficulty; `ListeningTrainerPolicy` may downgrade an unsafe challenge to stabilize or recover.
- OpenRouter/LLMs generate only structured training material. Dicta runtime still controls playback, rate, pauses, chunking, recovery, and Browser TTS execution.
- Browser TTS does not execute phrase replay; replay intent becomes recovery behavior such as shorter chunks, slower rate, and longer pauses.
- Browser TTS benchmark samples and completed session feedback carry a structured `ttsEnvironment` fingerprint with a hashed user agent, platform/PWA mode, selected voice metadata, and voice counts so reports can distinguish learner progress from browser, OS, voice, or speechSynthesis changes.

<!-- agent-kb-entry -->
## Documentation for agents

Technical onboarding for future agents starts here:

- `docs/README.md` - documentation index
- `docs/agent-onboarding.md` - required agent entry flow
- `docs/repo-map.md` - repository responsibilities and boundaries
- `docs/module-test-map.md` - module-to-test validation map
- `docs/high-risk-runtime-boundaries.md` - fragile runtime areas and safety rules
