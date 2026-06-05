# Dicta Architecture

This is the repo-owned architecture source of truth.

Before proposing or making behavior changes, agents must read and understand these files in order:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`

After reading them, propose changes from the architecture rather than from an isolated file edit. A valid proposal should identify the affected boundary: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar. If adaptive behavior is involved, identify the affected `(inputMode, language)` profile and how neighboring profiles stay unchanged.

Dicta is a Vite/React adaptive dictation trainer. The browser owns the training UI, local session state, and the Adaptive Pace Layer. Vercel/server routes protect secrets and cloud calls. Supabase Auth and RLS provide invite/admin-created accounts, cross-device sync, durable OpenRouter jobs, persistent job rate limits, and member quotas. Local-only Python sidecars handle WhisperX transcription, Kokoro TTS, and CosyVoice2 cache generation during development.

## Product Matrix

Dicta is built around 4 input modes x 5 languages.

Inputs:

- `audio`: uploaded or recorded original audio plus a word-level transcript.
- `browser-tts`: browser SpeechSynthesis with adaptive semantic chunking.
- `kokoro`: local Kokoro TTS sidecar. Native in this setup: `en`, `es`. Blocked or experimental: `de`, `fr`, `pt`.
- `cosyvoice-cache`: CosyVoice2 WAV cache files with browser TTS fallback when cache files are missing. Historical `qwen-cloud` values are treated as a legacy alias when reading stored/cache data.

Languages: `en`, `es`, `de`, `fr`, `pt`.

Adaptive benchmarks, telemetry, recommendations, and session feedback are scoped per `(inputMode, language)`. Do not share behavioral fixes across profiles unless the task explicitly asks for that.

## Runtime Boundaries

Browser app:

- `src/App.tsx`: workspace router and session orchestration host.
- `src/app/useTrainingSessionLifecycle.ts`: browser-side training lifecycle gates, setup locking, ready checklist derivation, and focused training action routing.
- `src/app/useAudioPlaybackRuntime.ts`: Input #1 browser audio element and AudioEngine runtime state/control boundary.
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
- `SemanticPhrasePlanner`: language-aware phrase boundaries.
- `AdaptiveDictationController`: rate, pause, replay, and chunk decisions.
- `AdaptiveInputLanguageBenchmarkService`: 30-day rolling profiles.
- `sessionFeedback` and `benchmarkJson`: exports and diagnostics.
- `HistoricalPerformanceService`: prior-session profile input.
- `supabaseSync` and `profileScopedStorage`: profile-aware persistence.
- `liveMetrics`: today, week, two-week, three-week, and 30-day month views.

Input adapters:

- `audio`: audio engine plus telemetry adapter.
- `browser-tts`: SpeechSynthesis plus dynamic chunk planner.
- `kokoro`: Kokoro sidecar plus telemetry adapter.
- `cosyvoice-cache`: CosyVoice2 cache plus browser fallback, with `qwen-cloud` accepted as a legacy cache/input alias.

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

- `scripts/transcribe_align.py`: WhisperX optional alignment.
- `services/kokoro_tts/*`: Kokoro TTS sidecar.
- `services/cosyvoice_cache/*`: CosyVoice2 cache sidecar.

## Adaptive Brain Loop

1. A session source provides audio transcript, typed text, OpenRouter script, or cached phrases.
2. `SemanticPhrasePlanner` produces phrase boundaries and difficulty.
3. The active input engine plays audio, TTS, or cached output.
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
- `dicta.kokoroEnabled.v1`

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

- `/api/transcribe` in `vite.config.ts`.
- `/api/kokoro/start`.
- `/api/cosyvoice/start` and `/api/cosyvoice/bootstrap`.
- `/api/admin/files`.
- `/api/openrouter/key*`.
- `/api/ollama/key*`.

## Files To Know

App runtime and adaptive core:

- `src/app/useAudioPlaybackRuntime.ts`
- `src/app/useTrainingSessionLifecycle.ts`
- `src/app/useAdaptiveRuntime.ts`
- `src/core/buildInfo.ts`
- `src/core/adaptive/types.ts`
- `src/core/adaptive/AdaptiveDictationController.ts`
- `src/core/adaptive/SemanticPhrasePlanner.ts`
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
- `src/core/adaptive/sessionFeedback.ts`
- `src/core/adaptive/dictationScriptPrompt.ts`
- `src/core/adaptive/dictationScriptValidation.ts`
- `src/core/adaptive/openRouterGenerationPrompt.ts`
- `src/core/adaptive/benchmarkJson.ts`

Input adapters:

- `src/inputs/audio/audioTelemetryAdapter.ts`
- `src/inputs/browserTts/browserTtsTelemetryAdapter.ts`
- `src/inputs/browserTts/ttsDynamicChunkPlanner.ts`
- `src/inputs/kokoro/kokoroTelemetryAdapter.ts`
- `src/inputs/qwenCloud/qwenCloudTelemetryAdapter.ts`
- `src/inputs/qwenCloud/qwenCloudAudioAdapter.ts`

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

- `scripts/transcribe_align.py`
- `services/kokoro_tts/*`
- `services/cosyvoice_cache/*`

## Known Gaps

- Production transcription still needs a deployed backend, object storage, and long-running job handling.
- Kokoro support for `de`, `fr`, and `pt` remains blocked or experimental.
- Input #4 still needs legacy `qwen-cloud` compatibility for existing manifests, stored sessions, and active OpenRouter jobs.
- Full-tree render volume during long Browser TTS runs can still be reduced.
