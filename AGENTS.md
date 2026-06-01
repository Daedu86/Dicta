# Agent Guide for Dicta

This is the first file an agent should read before touching Dicta. Dicta is a Vite/React dictation trainer with a shared adaptive "brain" called the Adaptive Pace Layer.

Read order for code changes:

1. `AGENTS.md` for repo rules and guardrails.
2. `README.md` for product overview, user model, and terminology.
3. `docs/architecture.md` for current topology and data flow.

If a change updates project behavior, keep these three docs aligned.

## Project Snapshot

Dicta trains listening and typing across 4 input modes and 5 languages. The shared adaptive state is scoped per `(inputMode, language)`, and the benchmark learning window is 30 days.

Inputs:

- `audio` / input 1 / original audio plus transcript
- `browser-tts` / input 2 / browser SpeechSynthesis
- `kokoro` / input 3 / local Kokoro TTS sidecar
- `qwen-cloud` / input 4 / legacy name for CosyVoice2 cached WAV playback with browser fallback

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
- Non-Supabase deployments can use `DICTA_APP_PASSWORD` middleware login.

## Commands

- Install JS deps: `npm install`
- Run app locally: `npm run dev`
- Run tests: `npm run test`
- Production build/typecheck: `npm run build`
- Optional ingestion dry run: `npm run ingest:dryrun`

Before finishing code changes, run `npm run test` and `npm run build` unless the change is docs-only or you clearly explain why you could not.

## Adaptive Pace Layer Rules

The Adaptive Pace Layer is shared across 4 inputs and 5 languages. Benchmarks, telemetry, recommendations, and session feedback are scoped per:

`(inputMode, language)`

Inputs:

- `audio` / input 1
- `browser-tts` / input 2
- `kokoro` / input 3
- `qwen-cloud` / input 4 (CosyVoice2 cache path, historical name)

Languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

The rolling adaptive benchmark window is 30 days (`rollingWindowDays: 30`). Dashboard and leaderboard "Month" views also mean 30 days.

When fixing benchmark, telemetry, recommendation, feedback, lag, pacing, or phrase-boundary behavior for one input/language pair, do not change the others unless the request explicitly says to. Prefer guards such as:

```ts
inputMode === 'browser-tts' && language === 'de'
```

or the equivalent local helper. Add regression tests proving unaffected inputs/languages keep their previous behavior.

Key brain files:

- `src/core/adaptive/types.ts`
- `src/core/adaptive/AdaptiveDictationController.ts`
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
  - Do not reintroduce synchronous full-session localStorage writes on every `sessions` update.
- Diagnostics:
  - `?perf=1` and `dicta.perfDiagnostics.v1` are used for field profiling in installed Android PWA runtime.
  - Keep diagnostics passive; avoid adding instrumentation that increases typing latency.

## Persistence and Sync

Browser storage keys:

- `dicta.sessions.v1`
- `dicta.deletedSessionIds.v1`
- `dicta.adaptiveBenchmarks.v1`
- `dicta.adaptiveSessionFeedback.v1`
- `dicta.perfDiagnostics.v1`
- `dicta.openrouterDefaultModel.v1`
- `dicta.openrouterGeneratedVariants.v1`
- `dicta.openrouterActiveJobs.v1`

Supabase sync stores JSON rows in `dicta_sync_items`. Session deletes are synced as tombstones, not hard deletes. Do not reintroduce hard-delete-only behavior, or deleted sessions can reappear on another device.

Supabase env vars are public Vite build vars and must be set locally and in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SYNC_PROFILE_ID`

OpenRouter durable jobs use `dicta_openrouter_jobs` via server routes only. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be referenced from Vite/client code.

After changing Vite env vars in Vercel, redeploy because they are baked into the build.

## OpenRouter and Deployment

OpenRouter calls must go through the server routes in `api/openrouter/*`. Do not store OpenRouter API keys in `localStorage` or expose them through `VITE_*` variables.

Hosted Vercel builds use `OPENROUTER_API_KEY` from Vercel environment variables. Keep free-model behavior and long timeout handling intentional; accepted model ids are `openrouter/free` or `*:free`.

OpenRouter access is profile-gated:

- `resolveRequestProfile` must stay server-side.
- Admins can use OpenRouter.
- Members need `can_access_openrouter = true`.
- Members with `assigned_openrouter_model` may only use that server-approved free model.
- Durable jobs use `/api/openrouter/jobs`, `waitUntil`, `dicta_openrouter_jobs`, a 3 active-job limit, and 14-day completed-job cleanup.

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
