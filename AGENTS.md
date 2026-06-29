# Agent Guide for Dicta

## Frontend Stylesheet Rules

Runtime CSS is modularized.

- `src/App.css` is a stylesheet entrypoint only and should remain limited to `@import "./styles/index.css";`.
- `src/styles/index.css` owns the ordered import graph for CSS modules.
- Add or change UI styles in the closest focused module under `src/styles/`; create a new module only when a boundary is clear.
- Always wire new CSS modules through `src/styles/index.css` in cascade order.
- Do not paste feature, page, sidebar, workspace, dashboard, adaptive, transcript, or responsive CSS back into `src/App.css`.
- Do not reorder CSS imports casually. Cascade order is intentional and part of the visual contract.
- Keep CSS-only commits focused. Do not mix stylesheet modularization with React, TypeScript, Supabase, Vercel, or adaptive policy changes unless the task explicitly requires that larger boundary.

## Browser Storage Rules

Do not store large runtime payloads in `localStorage`. Sessions, telemetry, adaptive benchmarks, adaptive feedback, and tombstones belong in IndexedDB (`dicta-local`) with Supabase as the remote sync ledger. `localStorage` is for small manifests, active profile pointers, preferences, and migration flags only. See `docs/storage-architecture.md`.


This is the first file an agent should read before touching Dicta. Dicta is a Vite/React dictation trainer with a shared adaptive "brain" called the Adaptive Pace Layer.

There is no user-facing Adaptive Pace Layer cockpit/dashboard tab. Adaptive data collection, benchmark updates, session feedback, OpenRouter generation context, Live Metrics diagnostics, IndexedDB persistence, and Supabase sync still use the Adaptive Pace Layer internally. User-facing adaptive surfaces are Training Mode, OpenRouter context/export behavior, Live Metrics diagnostics, and the Adaptive Pace Layer Flow workspace. The Flow workspace is primarily an implementation map, with Phase 1 / Generation owning the live direct OpenRouter Generate Training Session card. Its 2-10 minute selector is the locally persisted browser preference for direct Training generation buttons and their help text.

## Required Change Protocol

Before proposing or making any code change, read and understand these files in this order:

1. `AGENTS.md` for repo rules, guardrails, and required workflow.
2. `README.md` for product overview, user model, terminology, deployment assumptions, and current security model.
3. `docs/architecture.md` for current topology, data flow, boundaries, and known gaps.

After reading them, propose changes from the architecture rather than from an isolated file edit. A valid proposal should identify:

- Which runtime boundary is affected: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar.
- Which `(inputMode, language)` profile is affected, if the task touches adaptive behavior.
- Which files own the behavior and which docs/tests must change with it.
- Whether secrets, auth, rate limits, sync, localStorage, or PWA performance are affected.

Do not start implementation by guessing at a file. First map the request to the architecture, then make the smallest focused change that preserves existing boundaries. If behavior changes, keep `AGENTS.md`, `README.md`, and `docs/architecture.md` aligned.

## Current Runtime Shell Boundary

- `src/App.tsx` is shell-only and should stay small.
- Main app orchestration lives in `src/app/DictaAppRuntime.tsx`.
- Contract tests for focused training/TTS delegation should inspect `DictaAppRuntime`, not `App.tsx`.

## Project Snapshot

Dicta trains listening and typing with one canonical Browser TTS input across 5 languages. The shared adaptive state is scoped per `(inputMode, language)`, and the benchmark learning window is 20 rolling days.

Inputs:

- `browser-tts` / Browser TTS / browser SpeechSynthesis

Languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

Access model:

- Dicta uses invite/admin-created Supabase email/password accounts, not public signup.
- Admin users can manage members, OpenRouter access, assigned free OpenRouter model, and member session limits.
- Members default to 15 sessions and no OpenRouter access.
- Hosted and PWA access must go through Supabase Auth + RLS; there is no single-password app gate.
- OpenRouter configuration lives inside the Admin workspace as `/admin/openrouter`, not as a separate top-level header button.

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

Before finishing code changes, run `npm run test` and `npm run build` unless the change is docs-only or you clearly explain why you could not.

## Adaptive Pace Layer Rules

The Adaptive Pace Layer is shared across the Browser TTS input and 5 languages. Benchmarks, telemetry, recommendations, and session feedback are scoped per:

`(inputMode, language)`

Inputs:

- `browser-tts` / Browser TTS

Languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

The rolling adaptive benchmark window is 20 days (`rollingWindowDays: 20`). Dashboard and leaderboard 20-day views also mean the last 20 days.

Saved `finished` and `error` sessions are retained for 20 days based on last activity (`telemetry.finishedAt`, then `updatedAt`, then `createdAt`). Older completed/error sessions are automatically pruned from localStorage and synced as Supabase tombstones; pending or active `ready`/`running`/`paused` sessions are preserved. This saved-session retention is separate from the Adaptive Pace Layer benchmark timeline, which remains a 20-day rolling telemetry profile.
Supabase tombstones are retained for 30 days. Clients whose last successful sync is older than that tombstone window must full-refresh before pushing local rows.

`src/core/adaptive/ListeningTrainerPolicy.ts` is the central pedagogical policy layer for next-session generation. It converts one profile-specific benchmark, latest matching feedback, and user intent into a `ListeningTrainingPrescription`. Keep this policy pure and deterministic: no localStorage, no network calls, no Supabase access, and no cross-language or cross-input averaging.

OpenRouter and other LLM paths generate compact semantic training material only. Direct OpenRouter generation now requests `compact-chunks-v1` (`title` plus `chunks`) by default, and Dicta locally builds the full `DictationScript` from `ListeningTrainerPolicy`, `SemanticPhrasePlanner`, and the active adaptive policy. The Dicta runtime and Adaptive Pace Layer still control actual playback, rate, pauses, chunking, replay support, continuous adaptive level, and Browser TTS execution. Direct mobile generation buttons represent user intent (`recover`, `progress`, `challenge`), not unconditional difficulty commands; the policy may downgrade difficulty when the active `(inputMode, language)` profile is unstable.
Durable OpenRouter jobs must leave a persistence buffer before the 300-second Vercel function window, and stale `queued`/`running` jobs must become terminal failures on polling instead of staying active forever. Long 2-10 minute direct generation budgets scale with compact chunk text, not repeated per-phrase JSON metadata, and remain shared Browser TTS settings rather than language-specific runtime branches.

Browser TTS safe-boundary pauses are completion-gated at execution time with a default 700 ms minimum mental rest: once a safe learner-facing chunk finishes speaking, the next chunk may start after that minimum when the learner explicitly submits the chunk, or when the default 4000 ms fallback expires for non-final chunks. The visible Training editor is learner-paced: one editable safe chunk is shown with locked completed chunk history, future text stays hidden, and unsafe internal TTS slices are merged into the next safe semantic boundary instead of becoming learner-facing wait points. Correct typing alone does not advance Browser TTS during chunk practice. The final chunk uses `Finish session` and never auto-submits. During a completed/submitted safe pause, Dicta may copy original-script punctuation into completed typed words after a short idle window; cursor/editing conflicts leave punctuation pending for pause, stop, blur, or submit, and punctuation remains non-scoring. These two safe-pause execution defaults are small browser preferences editable from Adaptive Pace Layer Flow Step 5 / Playback loop. Adaptive timeline pause telemetry keeps `requestedPauseMs` as the controller target and records `actualPauseMs` from the resolved completion gate wait, with `pauseGateResolutionReason` set to `completed`, `submitted`, `timeout`, or `no-gate`.

Browser TTS benchmark samples and completed session feedback include a structured `ttsEnvironment` fingerprint (hashed user agent, platform/PWA mode, selected voice metadata, and voice counts) so analysis can separate learner progress from browser, OS, voice, or speechSynthesis changes without storing the raw user agent.

The active Listening V3 reset uses one continuous Browser TTS adaptive cycle for `en`, `es`, `de`, `fr`, and `pt`: normalized telemetry, universal sample quality, pressure vector, adaptive level, output mapper, and language calibration. Legacy `support/recovery/balanced/flow` values remain compatibility/debug labels only; do not make them the primary runtime motor again.

When fixing benchmark, telemetry, recommendation, feedback, lag, pacing, or phrase-boundary behavior for one input/language pair, do not change the others unless the request explicitly says to or the affected behavior belongs to this shared continuous cycle. Language-specific tolerances should be expressed through calibration/config, not separate DE/ES runtime pipelines. Add regression tests proving the intended shared or isolated behavior.

Key brain files:

- `src/core/adaptive/types.ts`
- `src/core/adaptive/continuousAdaptiveListeningTypes.ts`
- `src/core/adaptive/continuousAdaptiveListening.ts`
- `src/core/adaptive/runtimeSampleQualityGate.ts`
- `src/core/adaptive/adaptivePressureVector.ts`
- `src/core/adaptive/adaptivePacingOutputMapper.ts`
- `src/core/adaptive/languageAdaptiveCalibration.ts`
- `src/core/adaptive/AdaptiveDictationController.ts`
- `src/core/adaptive/ListeningTrainerPolicy.ts`
- `src/core/adaptive/SemanticPhrasePlanner.ts`
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
- `src/core/adaptive/sessionFeedback.ts`
- `src/core/adaptive/dictationScriptPrompt.ts`
- `src/core/adaptive/dictationScriptValidation.ts`
- `src/core/adaptive/benchmarkJson.ts`

## Training Mode Performance Rules
