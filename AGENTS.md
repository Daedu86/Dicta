# Agent Guide for Dicta

This is the first file an agent should read before touching Dicta. Dicta is a Vite/React dictation trainer with a shared adaptive "brain" called the Adaptive Pace Layer.

## Required Change Protocol

Before proposing or making any code change, read and understand these files in this order:

1. `AGENTS.md` for repo rules, guardrails, and required workflow.
2. `README.md` for product overview, user model, terminology, deployment assumptions, and current security model.
3. `docs/architecture.md` for current topology, data flow, boundaries, and known gaps.

After reading them, propose the change from the architecture rather than from an isolated file edit. A valid proposal should identify:

- Which runtime boundary is affected: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar.
- Which `(inputMode, language)` profile is affected, if the task touches adaptive behavior.
- Which files own the behavior and which docs/tests must change with it.
- Whether secrets, auth, rate limits, sync, localStorage, or PWA performance are affected.

Do not start implementation by guessing at a file. First map the request to the architecture, then make the smallest focused change that preserves existing boundaries. If behavior changes, keep `AGENTS.md`, `README.md`, and `docs/architecture.md` aligned.

## Project Snapshot

Dicta trains listening and typing across 4 input modes and 5 languages. The shared adaptive state is scoped per `(inputMode, language)`, and the benchmark learning window is 30 days.

Inputs:

- `audio` / input 1 / original audio plus transcript
- `browser-tts` / input 2 / browser SpeechSynthesis
- `kokoro` / input 3 / local Kokoro TTS sidecar
- `cosyvoice-cache` / input 4 / CosyVoice2 cached WAV playback with browser fallback

Legacy stored/cache data may still use `qwen-cloud`; normalize it to `cosyvoice-cache` before writing new adaptive or OpenRouter job state.

Languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

Access model:

- Supabase deployments are invite/admin-created email/password accounts, not public signup.
- Admin users can manage members, OpenRouter access, assigned free OpenRouter model, and member session limits.
- Members default to 15 sessions and no OpenRouter access.
- Non-Supabase deployments can use `DICTA_APP_PASSWORD` middleware login as a private/local fallback only.

Test account:

- A Supabase E2E test account is available for local and remote app verification. Use `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and `E2E_TEST_PROFILE_ID` from `.env.local` or the secure execution environment when a task requires signing in.
- Do not commit the test account password or copy it into docs, source, localStorage, screenshots, or logs. Document only the variable names.
- Before blocking on authentication in local or remote checks, try this test account first and report whether sign-in and profile loading work.

## Commands

- Install JS deps: `npm install`
- Run app locally: `npm run dev`
- Run tests: `npm run test`
- Production build/typecheck: `npm run build`
- Run mobile training E2E guard: `npm run test:e2e:mobile`
- Optional ingestion dry run: `npm run ingest:dryrun`

Before finishing code changes, run `npm run test` and `npm run build` unless the change is docs-only or you clearly explain why you could not.

## Adaptive Pace Layer Rules

The Adaptive Pace Layer is shared across 4 inputs and 5 languages. Benchmarks, telemetry, recommendations, and session feedback are scoped per:

`(inputMode, language)`

Inputs:

- `audio` / input 1
- `browser-tts` / input 2
- `kokoro` / input 3
- `cosyvoice-cache` / input 4 (CosyVoice2 cache path; `qwen-cloud` is a legacy alias)

Languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

The rolling adaptive benchmark window is 30 days (`rollingWindowDays: 30`). Dashboard and leaderboard "Month" views also mean 30 days.

`src/core/adaptive/ListeningTrainerPolicy.ts` is the central pedagogical policy layer for next-session generation. It converts one profile-specific benchmark, latest matching feedback, and user intent into a `ListeningTrainingPrescription`. Keep this policy pure and deterministic: no localStorage, no network calls, no Supabase access, and no cross-language or cross-input averaging.

OpenRouter and other LLM paths generate structured training material only. The Dicta runtime and Adaptive Pace Layer still control actual playback, rate, pauses, chunking, recovery, and Browser TTS execution. Direct mobile generation buttons represent user intent (`recover`, `progress`, `challenge`), not unconditional difficulty commands; the policy may downgrade difficulty when the active `(inputMode, language)` profile is unstable.

Browser TTS benchmark samples and completed session feedback include a structured `ttsEnvironment` fingerprint (hashed user agent, platform/PWA mode, selected voice metadata, and voice counts) so analysis can separate learner progress from browser, OS, voice, or speechSynthesis changes without storing the raw user agent.

When fixing benchmark, telemetry, recommendation, feedback, lag, pacing, or phrase-boundary behavior for one input/language pair, do not change the others unless the request explicitly says to. Prefer guards such as:

```ts
inputMode === 'browser-tts' && language === 'de'
```

or the equivalent local helper. Add regression tests proving unaffected inputs/languages keep their previous behavior.

Key brain files:

- `src/core/adaptive/types.ts`
- `src/core/adaptive/AdaptiveDictationController.ts`
- `src/core/adaptive/ListeningTrainerPolicy.ts`
- `src/core/adaptive/SemanticPhrasePlanner.ts`
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
- `src/core/adaptive/sessionFeedback.ts`
- `src/core/adaptive/dictationScriptPrompt.ts`
- `src/core/adaptive/dictationScriptValidation.ts`
- `src/core/adaptive/benchmarkJson.ts`

Browser TTS specific adapters live under `src/inputs/browserTts/`.

## Training Mode Performance Rules

Recent mobile/PWA fixes changed how `/training` handles typing and persistence. Preserve these behaviors unless the task explicitly replaces them.

- `LowLatencyTextarea` behavior:
  - Treat it as a low-latency uncontrolled input. Do not reintroduce per-keystroke React state updates for visible text.
  - Keep deferred parent commits plus flush on blur, submit, pause/stop, unmount, and session/input switch.
  - Keep session/input synchronization (`syncKey`) so session switches do not leak stale draft text.
- Browser TTS runtime updates:
  - Keep adaptive sampling cadence (`config.tickMs`) for decision quality.
  - Keep throttled UI publication of runtime metrics to avoid full-tree rerender pressure while typing.
  - If you touch Browser TTS live evaluation, ensure it can consume the latest local draft text and not only deferred committed state.
- Session persistence:
  - `dicta.sessions.v1` writes are intentionally debounced for performance.
  - Preserve immediate persistence on finalize/submit paths and lifecycle flushes (`pagehide`, `beforeunload`, hidden visibility).
  - Finalized session rows also use a best-effort Supabase `keepalive` flush on page exit so mobile/PWA submits are less likely to remain remote `ready` rows.
  - Do not reintroduce synchronous full-session localStorage writes on every `sessions` update.
- Diagnostics:
  - `?perf=1` and `dicta.perfDiagnostics.v1` are used for field profiling in installed Android PWA runtime.
  - Keep diagnostics passive; avoid adding instrumentation that increases typing latency.
  - `tests/LowLatencyTextareaContract.test.ts`, `tests/lowLatencyTextarea.test.ts`, and `tests/lowLatencyPerformanceGate.test.ts` protect the low-latency typing contract.
  - `npm run test:e2e:mobile` runs the Playwright mobile guard against `e2e-training.html`, backed by `src/e2e/trainingPerfHarness.tsx` and `e2e/training-mobile.spec.ts`, to catch real-browser typing/render regressions. GitHub CI runs this guard after `npm run build` and uploads Playwright trace, screenshot, and video artifacts only on failure.

## Persistence and Sync

Browser storage keys:

- `dicta.sessions.v1`
- `dicta.deletedSessionIds.v1`
- `dicta.adaptiveBenchmarks.v1`
- `dicta.adaptiveSessionFeedback.v1`
- `dicta.perfDiagnostics.v1`
- `dicta.openrouterDefaultModel.v1`
- `dicta.ollamaDefaultModel.v1`
- `dicta.openrouterGeneratedVariants.v1`
- `dicta.openrouterActiveJobs.v1`

Supabase sync stores JSON rows in `dicta_sync_items`. Session deletes are synced as tombstones, not hard deletes. Do not reintroduce hard-delete-only behavior, or deleted sessions can reappear on another device.
Authenticated Supabase sessions must complete the initial pull/merge before rendering profile-scoped session UI, so a hard refresh does not briefly show stale localStorage rows. Remote session tombstones are sticky against local `ready`/pending copies; only a newer locally submitted finished session may repair an older tombstone.
Completed session feedback rows are completion evidence for their session id, so stale `ready` copies from another tab/device must not keep a practiced session pending or overwrite the repaired finished session.

Supabase env vars are public Vite build vars and must be set locally and in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SYNC_PROFILE_ID`

Server-only Supabase usage:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be referenced from Vite/client code, `src/`, or `public/`.
- CI checks for `SERVICE_ROLE_KEY` leakage in `src` and `public`.
- Durable OpenRouter jobs use `dicta_openrouter_jobs` plus `dicta_rate_limits` through server routes only.

After changing Vite env vars in Vercel, redeploy because they are baked into the build.

## OpenRouter and Deployment

OpenRouter calls must go through the server routes in `api/openrouter/*`. Do not store OpenRouter API keys in `localStorage` or expose them through `VITE_*` variables.

Ollama Cloud calls must go through the server routes in `api/ollama/*`. Do not store `OLLAMA_API_KEY` in `localStorage` or expose it through `VITE_*` variables. Ollama models do not use `:free`; access and quota depend on the configured Ollama account tier.

Hosted Vercel builds use `OPENROUTER_API_KEY` from Vercel environment variables. Keep free-model behavior and long timeout handling intentional; accepted model ids are `openrouter/free` or `*:free`.

Hosted Vercel builds use `OLLAMA_API_KEY` from Vercel environment variables for the Ollama workspace. The initial recommended model is `gemma3:27b-cloud`.

OpenRouter access is profile-gated:

- `resolveRequestProfile` must stay server-side.
- Admins can use OpenRouter.
- Members need `can_access_openrouter = true`.
- Members with `assigned_openrouter_model` may only use that server-approved free model.
- Durable jobs use `/api/openrouter/jobs`, `waitUntil`, `dicta_openrouter_jobs`, a 3 active-job limit, 14-day completed-job cleanup, and persistent hourly rate limiting through `dicta_check_rate_limit`.

Default durable-job rate limits:

- Members: `DICTA_OPENROUTER_MEMBER_JOBS_PER_HOUR=20`
- Admins: `DICTA_OPENROUTER_ADMIN_JOBS_PER_HOUR=120`

If `dicta_check_rate_limit` is missing or broken, `/api/openrouter/jobs` must fail closed instead of accepting public beta jobs without rate limiting.

## Python Dependencies

Core setup uses:

```bash
pip install -r requirements.txt
```

Optional WhisperX/Torch alignment uses:

```bash
pip install -r requirements-alignment.txt
```

Do not add `transformers>=5.0.0rc3` to core requirements without an explicit compatibility test for the optional alignment stack. Do not load untrusted Hugging Face or PyTorch checkpoint folders.

## Git and Scope

Keep commits focused. Do not revert unrelated user changes. If a task touches adaptive behavior, include tests for the exact input/language pair and regressions for neighboring pairs where risk is high.
