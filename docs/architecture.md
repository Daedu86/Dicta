# Dicta Architecture

## Frontend Stylesheet Architecture

Runtime CSS is fully modularized.

- `src/App.css` is intentionally retained as the Vite/React stylesheet entrypoint and should only import `src/styles/index.css`.
- `src/styles/index.css` is the single ordered cascade manifest for extracted runtime CSS modules.
- CSS modules under `src/styles/` are grouped by UI/runtime boundary: auth, training shell/session/header/interaction/responsive, workspace shell/responsive, TTS workspace, session status, transcript preview/review, sidebar support/brand/controls, dashboard, admin, leaderboard, adaptive workspace/timeline/charts, bottom metrics, shared controls, app shell, and final responsive breakpoints.
- Responsive CSS that was formerly in `App.css` is now module-owned, including `responsive-980.css` and `responsive-640.css`, with imports ordered after the modules they override.
- New runtime styles should be added to the closest existing module. If a new module is needed, import it through `src/styles/index.css` at the point that preserves the original cascade.
- Do not reintroduce runtime selectors into `src/App.css`.
- Do not reorder module imports without checking the cascade impact in desktop, mobile width, sidebar expanded/collapsed, training, TTS workspace, dashboard/admin, and adaptive views.


This is the repo-owned architecture source of truth.

Before proposing or making behavior changes, agents must read and understand these files in order:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`

After reading them, propose changes from the architecture rather than from an isolated file edit. A valid proposal should identify the affected boundary: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar. If adaptive behavior is involved, identify the affected `(inputMode, language)` profile and how neighboring profiles stay unchanged.

## Product Matrix

Dicta is built around one canonical Browser TTS input x 5 languages.

Inputs:

- `browser-tts`: browser SpeechSynthesis with adaptive semantic chunking.

Languages: `en`, `es`, `de`, `fr`, `pt`.

Adaptive benchmarks, telemetry, recommendations, and session feedback are scoped per `(inputMode, language)`. Do not share behavioral fixes across profiles unless the task explicitly asks for that.

## Runtime Boundaries

Browser app:

- `src/App.tsx`: workspace router and session orchestration host.
- `src/app/useSupabaseAuthActions.ts`: browser-side Supabase sign-in, password reset/update, and sign-out action handlers.
- `src/app/useSessionCreationActions.ts`: browser-side plain-text session creation, DictationScript import validation/creation, and OpenRouter script session creation actions.
- `src/app/useOpenRouterGenerationActions.ts`: browser-side direct-training OpenRouter generation actions, prompt/job orchestration, and generation failure handling.
- `src/app/useTrainingSessionLifecycle.ts`: browser-side training lifecycle gates, setup locking, ready checklist derivation, and focused training action routing.
- `src/app/useBrowserTtsRuntime.ts`: Browser TTS SpeechSynthesis voice discovery and command boundary.
- `src/app/useAdaptiveExportActions.ts`: browser-side adaptive benchmark/session-feedback export, copy, and insights diagnostic actions.
- `/training`: low-latency typing surface and session controls.
- Dedicated mobile typing performance harness: `e2e-training.html` mounts `src/e2e/trainingPerfHarness.tsx`; `e2e/training-mobile.spec.ts` runs it with Playwright's mobile Chrome profile through `npm run test:e2e:mobile`. GitHub CI enforces this guard after the production build and uploads Playwright trace, screenshot, and video artifacts only on failure.
- Adaptive Pace Layer cockpit: benchmark and feedback diagnostics.
- OpenRouter workspace: structured dictation script generation slots.
- Ollama workspace: Ollama Cloud model listing and chat-test prompt surface.
- Admin workspace: members, remote sessions, and local diagnostics.
- `localStorage`: sessions, tombstones, benchmarks, feedback, OpenRouter drafts/jobs, and default provider models.
- Finalized session rows are buffered for critical Supabase sync and sent with a best-effort `keepalive` flush during page exit, which reduces mobile/PWA cases where a submitted session remains a remote `ready` row.
- PWA shell: manifest and service worker.

Core TypeScript domain:

- `src/core/buildInfo.ts`: build metadata formatting for browser display.
- `src/core/languages.ts`: supported languages.
- `src/app/useAdaptiveRuntime.ts`: browser-side adaptive controller wiring, benchmark update dispatch, selected profile glue, live telemetry application, and session feedback orchestration.
- `ListeningTrainerPolicy`: pure profile-specific pedagogical policy that converts one `(inputMode, language)` benchmark, latest matching feedback, and user intent into a `ListeningTrainingPrescription` for next-session generation.
- `SemanticPhrasePlanner`: language-aware phrase boundaries.
- `AdaptiveDictationController`: rate, pause, replay, and chunk decisions.
- `AdaptiveInputLanguageBenchmarkService`: 30-day rolling profiles.
- `sessionFeedback` and `benchmarkJson`: exports and diagnostics.
- `HistoricalPerformanceService`: prior-session profile input.
- `supabaseSync` and `profileScopedStorage`: profile-aware persistence.
- `liveMetrics`: today, week, two-week, three-week, and 30-day month views.

Input adapters:

- `browser-tts`: SpeechSynthesis plus dynamic chunk planner.

Server routes and local dev middleware:

- `api/auth/*` and `middleware.js`: legacy private password fallback.
- `api/_supabaseProfile.js`: signed-in profile resolution.
- `api/_securityEvents.js`: shared server-side security event logging and `dicta_security_events` persistence.
- `api/admin/users.js`: admin-created users and access controls.
- `api/openrouter/*`: models, chat, durable jobs, access gating, active-job limits, and persistent rate limits.
- `api/ollama/*`: Ollama Cloud models, chat test, and server-side key status.
- `vite.config.ts`: local-only middleware for transcription, local OpenRouter/Ollama key UI, sidecar start/bootstrap, and local file inventory.

Supabase multiuser path:

- Supabase Auth: email/password users.
- `dicta_app_profiles`: role, active flag, quotas, OpenRouter access, assigned model.
- `dicta_sync_items`: session, benchmark, and feedback JSON rows.
- `dicta_openrouter_jobs`: durable generation jobs.
- `dicta_rate_limits`: server-side OpenRouter job throttling.
- `dicta_security_events`: server-side security audit events written through service-role routes only.
- RLS/helper functions: members see their own rows, admins can manage all rows.

Ollama Cloud uses `OLLAMA_API_KEY` through server routes only. It currently has no durable job table, no Supabase/RLS schema changes, and no Adaptive Pace Layer profile behavior.

Local-only services:

## Adaptive Brain Loop

1. A session source provides typed text or an OpenRouter script.
2. `SemanticPhrasePlanner` produces phrase boundaries and difficulty.
3. The active input engine plays TTS or generated local audio.
4. `LowLatencyTextarea` captures learner typing without per-keystroke React state for visible text.
5. Input telemetry adapters produce `LiveTelemetryFrame`.
6. `HistoricalPerformanceService` and the 30-day benchmark provide profile context.
7. `AdaptiveDictationController` emits a `PacingDecision`.
8. The input engine applies supported controls.
9. Benchmarks, feedback, and session data persist to localStorage and optionally Supabase.

Important implementation details:

- The adaptive benchmark rolling window is 30 days.
- Timeline storage is capped and pruned by timestamp.
- Browser TTS German has extra recovery, lag, and unsafe-boundary filtering. Keep changes narrowly guarded.
- Browser TTS does not execute phrase replay; replay intent becomes recovery behavior.
- `ListeningTrainerPolicy` is the main future iteration point for listening-training quality. It preserves benchmark separation per `(inputMode, language)` and does not read localStorage, call network APIs, mutate benchmark data, or average across languages/inputs.
- OpenRouter and other LLM paths generate structured training material only. The trainer prescription is the pedagogical source of truth for generation, while the runtime/adaptive pace layer controls actual playback, rate, pauses, chunking, recovery, and Browser TTS execution.
- Direct mobile generation buttons represent user intent (`recover`, `progress`, `challenge`) rather than absolute difficulty commands; the policy can downgrade an unsafe challenge to stabilize or recover.
- Browser TTS benchmark samples and completed session feedback are tagged with a structured `ttsEnvironment` fingerprint (hashed user agent, platform/PWA mode, selected voice metadata, and voice counts) so benchmark/report analysis can separate learner progress from browser, OS, voice, or speechSynthesis changes without storing the raw user agent.
- Training text input is intentionally low-latency and uncontrolled.
- Low-latency typing is covered by contract/regression tests plus the Playwright mobile guard for the dedicated training harness.

## Account And Access Model

Supabase Auth is the current multiuser path. Accounts are invite/admin-created from the Admin workspace; there is no public self-signup flow in the repo.

Profile rules:

- `dicta_app_profiles` maps each Supabase user to one `profile_id`.
- Admins can read/manage all profiles and rows through RLS.
- Members can sync only their own rows.
- Members default to `session_limit = 15`, `can_access_openrouter = false`, and optional `assigned_openrouter_model = null`.

Legacy password fallback:

- If Supabase Auth is not configured and `DICTA_APP_PASSWORD` is set, `middleware.js` redirects browser users to `public/login.html`.
- The password cookie is only a private/local fallback gate; it is not the multiuser profile model.
- `/api/auth/login` rate-limits legacy password attempts in memory. This fallback is not the public beta access path.

Verification test account:

- Local and remote app verification can use the invite/admin-created Supabase E2E test account from `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and `E2E_TEST_PROFILE_ID`.
- These vars are for agent/developer verification only. They are not Vite browser vars, and the password must not be committed, copied into docs/source, stored in `localStorage`, or exposed in screenshots/logs.
- If a task needs authenticated local or hosted testing, try this account before blocking on missing credentials, and confirm both Supabase sign-in and `dicta_app_profiles` loading.

## Persistence And Sync

Primary browser storage keys:

- `dicta.sessions.v1`
- `dicta.deletedSessionIds.v1`
- `dicta.adaptiveBenchmarks.v1`
- `dicta.adaptiveSessionFeedback.v1`
- `dicta.perfDiagnostics.v1`
- `dicta.openrouterDefaultModel.v1`
- `dicta.ollamaDefaultModel.v1`
- `dicta.openrouterGeneratedVariants.v1`
- `dicta.openrouterActiveJobs.v1`

Supabase sync stores JSON rows in `dicta_sync_items` with item types `session`, `benchmark`, and `feedback`.

Session deletes are tombstones, not hard deletes. The tombstone payload must contain JSON boolean `deleted: true`.

Authenticated profile UI waits for the initial Supabase pull/merge before rendering profile-scoped sessions, so a hard refresh does not briefly expose stale localStorage rows. Remote session tombstones are sticky against local `ready`/pending copies; only a newer locally submitted finished session may repair an older tombstone.
Completed feedback rows are also completion evidence for their session id. During merge and push filtering, they repair stale `ready` session rows and block local pending copies from overwriting a practiced session.

## OpenRouter Architecture

OpenRouter is for structured dictation script generation. It is not a playback engine and it must not expose secrets to the browser.

Routes:

- `GET /api/openrouter/models`: lists OpenRouter models through the server key.
- `POST /api/openrouter/chat`: immediate chat completion path.
- `POST /api/openrouter/jobs`: durable job creation for mobile or long requests.
- `GET /api/openrouter/jobs?id=...`: durable job polling.

Server-side rules:

- OpenRouter and Supabase service credentials are server-only.
- Server-only Supabase role keys must never be referenced from `src/` or `public/`.
- Accepted model ids are `openrouter/free` or ids ending in `:free`.
- Prompt length is capped at 32,000 characters.
- Immediate chat `maxTokens` is bounded between 128 and 1,800.
- Durable job `maxTokens` is bounded between 128 and 4,800, with defaults sized by requested session duration.
- Durable jobs use `dicta_openrouter_jobs`, `waitUntil`, a 3 active-job limit, and cleanup of completed jobs older than 14 days.
- Durable job creation is persistently rate-limited per profile through `dicta_rate_limits` and `dicta_check_rate_limit`.
- OpenRouter and admin routes write security events through `api/_securityEvents.js`; OpenRouter rate-limit helpers re-export it for compatibility.
- Default durable-job rate limits are 20 jobs per hour for members and 120 jobs per hour for admins.
- If the rate-limit RPC is missing or fails, `/api/openrouter/jobs` fails closed instead of accepting jobs without throttling.
- Profile resolution and model authorization stay server-side.

Local Vite dev mirrors most OpenRouter behavior and exposes dev-only key management endpoints for `.env.local`. Do not bring those endpoints into production client code.

## Ollama Cloud Architecture

Ollama Cloud is a separate model gateway workspace for chat testing. It does not replace OpenRouter, does not create DictationScript sessions, and does not participate in the Adaptive Pace Layer.

Routes:

- `GET /api/ollama/models`: lists Ollama Cloud models through the server key.
- `POST /api/ollama/chat`: sends a non-streaming chat request to `https://ollama.com/api/chat`.
- `GET /api/ollama/key/status`: reports whether `OLLAMA_API_KEY` is configured without exposing it.

Server-side rules:

- `OLLAMA_API_KEY` stays server-only and must never be referenced from browser code as a `VITE_*` value.
- Accepted model ids must match `/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/`.
- The initial recommended model is `gemma3:27b-cloud`.
- Ollama Cloud models do not use `:free`; access and quota depend on the configured Ollama account tier.
- Upstream `429` responses are surfaced as likely rate/quota limits. Upstream `401` and `403` responses are surfaced as auth/plan/access issues.

Local Vite dev mirrors the Ollama models/chat/status routes and exposes dev-only key management endpoints for `.env.local`.

## Local-Only Development Services

These paths are not production Vercel backend features:

- `/api/admin/files`.
- `/api/openrouter/key*`.
- `/api/ollama/key*`.

## Files To Know

App runtime and adaptive core:

- `src/app/useBrowserTtsRuntime.ts`
- `src/app/useSupabaseAuthActions.ts`
- `src/app/useSessionCreationActions.ts`
- `src/app/useOpenRouterGenerationActions.ts`
- `src/app/useTrainingSessionLifecycle.ts`
- `src/app/useAdaptiveRuntime.ts`
- `src/app/useAdaptiveExportActions.ts`
- `src/core/buildInfo.ts`
- `src/core/adaptive/types.ts`
- `src/core/adaptive/AdaptiveDictationController.ts`
- `src/core/adaptive/ListeningTrainerPolicy.ts`
- `src/core/adaptive/SemanticPhrasePlanner.ts`
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
- `src/core/adaptive/sessionFeedback.ts`
- `src/core/adaptive/dictationScriptPrompt.ts`
- `src/core/adaptive/dictationScriptValidation.ts`
- `src/core/adaptive/openRouterGenerationPrompt.ts`
- `src/core/adaptive/benchmarkJson.ts`

Input adapters:

- `src/inputs/browserTts/browserTtsTelemetryAdapter.ts`
- `src/inputs/browserTts/ttsDynamicChunkPlanner.ts`

Auth/sync/server:

- `src/core/supabaseSync.ts`
- `src/core/appProfiles.ts`
- `api/_supabaseProfile.js`
- `api/_securityEvents.js`
- `api/admin/users.js`
- `api/openrouter/*`
- `api/ollama/*`
- `middleware.js`
- `docs/supabase-openrouter-jobs.sql`
- `docs/supabase-events.sql`
- `supabase/migrations/*`

Local services:

## Known Gaps

- Production transcription still needs a deployed backend, object storage, and long-running job handling.
- Full-tree render volume during long Browser TTS runs can still be reduced.
