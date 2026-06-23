# Dicta Architecture

## Frontend Stylesheet Architecture

Runtime CSS is fully modularized.

- `src/App.css` is intentionally retained as the Vite/React stylesheet entrypoint and should only import `src/styles/index.css`.
- `src/styles/index.css` is the single ordered cascade manifest for extracted runtime CSS modules.
- CSS modules under `src/styles/` are grouped by UI/runtime boundary: auth, training shell/session/header/interaction/responsive, workspace shell/responsive, TTS workspace, session status, transcript preview/review, sidebar support/brand/controls, dashboard, admin, leaderboard, adaptive flow/OpenRouter export styles, bottom metrics, shared controls, app shell, and final responsive breakpoints.
- Responsive CSS that was formerly in `App.css` is now module-owned, including `responsive-980.css` and `responsive-640.css`, with imports ordered after the modules they override.
- New runtime styles should be added to the closest existing module. If a new module is needed, import it through `src/styles/index.css` at the point that preserves the original cascade.
- Do not reintroduce runtime selectors into `src/App.css`.
- Do not reorder module imports without checking the cascade impact in desktop, mobile width, sidebar expanded/collapsed, training, TTS workspace, dashboard/admin, and adaptive views.


This is the repo-owned architecture source of truth.

Before proposing or making behavior changes, agents must read and understand these files in order:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture.md`
4. `docs/adaptive-training-cycle.md` for adaptive generation, planner, controller, Browser TTS, benchmark/feedback, or insight-report work.

After reading them, propose changes from the architecture rather than from an isolated file edit. A valid proposal should identify the affected boundary: browser, core TypeScript domain, input adapter, Vercel/server route, Supabase/RLS, or local-only sidecar. If adaptive behavior is involved, identify the affected `(inputMode, language)` profile and how neighboring profiles stay unchanged.

## Related adaptive docs

Start adaptive iteration from [Adaptive Training Cycle](./adaptive-training-cycle.md).

Storage ownership and migration details live in [Storage Architecture](./storage-architecture.md).

Layer-specific references:

- [Listening-First Architecture](./listening-first-architecture.md)
- [Adaptive Listening Brain](./adaptive-listening-brain.md)
- [Listening Cycle V3 Architecture](./listening-cycle-v3-architecture.md)

## Product Matrix

Dicta is built around one canonical Browser TTS input x 5 languages.

Inputs:

- `browser-tts`: browser SpeechSynthesis with adaptive semantic chunking.

Languages: `en`, `es`, `de`, `fr`, `pt`.

Adaptive benchmarks, telemetry, recommendations, and session feedback are scoped per `(inputMode, language)`. Do not share behavioral fixes across profiles unless the task explicitly asks for that.

Visible training modes are only `Precision`, `Stabilize`, and `Challenge`. Legacy one-minute express OpenRouter jobs and short historical sessions remain compatible storage/job metadata, but they are grouped into the same three modes in Training Mode, Leaderboard, OpenRouter status, Admin-visible summaries, and notifications.

## Runtime Boundaries

Browser app:

- `src/App.tsx`: shell-only React entrypoint. It imports `App.css` and renders `DictaAppRuntime`; it should stay small and must not regain runtime ownership.
- `src/app/DictaAppRuntime.tsx`: runtime export shim. It re-exports `DictaAppRuntime` from `DictaAppRuntimeRoot` and should not regain runtime behavior.
- `src/app/DictaAppRuntimeRoot.tsx`: main browser composition root. It wires auth/profile, sync, workspace routing, root OpenRouter, focused training, presentation props, and route rendering while delegating behavior to narrower owner hooks.
- `src/app/useDictaAppBootRuntime.ts`: root boot-state boundary for perf diagnostics, session state, training state, routing, theme, Browser TTS, and root refs.
- `src/app/useDictaRootOpenRouterRuntime.ts`: root OpenRouter adapter that maps active input mode to OpenRouter fallback input mode and delegates to `useDictaOpenRouterRuntime`.
- `src/app/useDictaRootRouteCompositionRuntime.ts`: root route-composition adapter that delegates to `useDictaAppRouteCompositionRuntime`.
- `src/app/AppRouteRenderer.tsx`: route-level render branching for auth, focused training, workspace, dashboard, adaptive, OpenRouter, Admin, Leaderboard, and fallbacks.
- `src/app/appOrigin.ts`: canonical app-origin helper used for production-return navigation and other absolute in-app links.
- `src/app/useSupabaseAuthActions.ts`: browser-side Supabase sign-in, password reset/update, and sign-out action handlers. Password recovery redirects use `VITE_DICTA_AUTH_REDIRECT_ORIGIN` when configured, with a local/dev fallback to the current browser origin, so hosted member recovery does not depend on protected Vercel preview URLs.
- `src/app/useAuthProfileRuntime.ts`: auth/profile composition boundary over auth state, profile resolution, Supabase auth actions, and auth header construction.
- `src/app/useSessionCreationRuntime.ts`: browser-side plain-text session creation, DictationScript import validation/creation, and OpenRouter script session creation actions.
- `src/app/useSessionPersistenceRuntime.ts`: local/profile-scoped persistence, Supabase sync, quotas, deletion persistence, and pending sync state.
- `src/app/useFocusedTrainingRuntime.ts`: focused-training composition, active-session sync, TTS handoff, and focused route props.
- `src/app/useTtsSessionOrchestrationRuntime.ts`: TTS orchestration across keyboard remap, practice input, metrics, Browser TTS playback loop, controls, reset, and submit.
- `src/app/useBrowserTtsRuntime.ts`: Browser TTS SpeechSynthesis voice discovery and command boundary.
- `src/app/useBrowserTtsPlaybackLoop.ts`: Browser TTS playback loop owner for `playTts` / `playTtsFromWord`, utterance configuration, event handlers, phrase progression, telemetry handoff, and completion-gated next-chunk scheduling.
- `src/app/useTtsPlaybackControls.ts`: Browser TTS pause/resume/stop/seek controls and related status transitions.
- `src/app/useResetSessionRuntime.ts`: reset-session side-effect sequencing, including playback stop ordering, ref cleanup, UI metric reset, setup-lock preservation, and adaptive feedback reset.
- `src/app/useTtsSessionSubmitAction.ts`: Browser TTS submit orchestration, final sampling, finalization, persistence push, playback stop, and finished statuses.
- `src/app/useTtsTelemetryRecorder.ts`: Browser TTS attempt telemetry initialization, elapsed-time calculation, control-action recording, and chunk telemetry recording.
- `src/app/useTtsUiPublisher.ts`: Browser TTS live metric UI publication thresholds, throttling, ref updates, and visible metric setter routing.
- `src/app/useTtsPlaybackProgressEstimator.ts`: Browser TTS spoken-word progress estimation for active chunks, completed-word fallback, and finished playback.
- `src/app/browserTtsPlaybackPlan.ts`: pure Browser TTS next-chunk playback planning for candidate chunk selection, continuous adaptive decision mapping, runtime rate floor, V3 pause resolution, unsafe-boundary policy, mobile fallback, telemetry frames, and rolling accuracy state updates.
- `src/app/browserTtsNextChunkScheduler.ts` and `src/app/browserTtsChunkCompletionGate.ts`: pure Browser TTS next-chunk scheduling helpers that keep safe-boundary pauses completion-gated while preserving timeout fallback behavior.
- `src/app/browserTtsPlaybackDecisionTrace.ts`: pure diagnostic decision trace snapshots for planned, clamped, runtime, and benchmark-recorded Browser TTS chunk outcomes.
- `src/app/browserTtsPlaybackLoopChunkSpeaker.ts`: single-chunk Browser TTS execution seam for plan build, utterance creation, telemetry commit, utterance handlers, and SpeechSynthesis execution.
- `src/app/browserTtsAdaptiveSemanticDebug.ts`: pure Browser TTS semantic debug state builders for phrase-start aggregation and chunk-completion phrase identity/counter updates.
- `src/app/browserTtsPhraseCompletionTelemetry.ts`: pure Browser TTS phrase-completion benchmark telemetry payload construction.
- `src/app/ttsSessionFinalization.ts`: pure TTS session finalization state construction used by `useTtsSessionSubmitAction`.
- `src/app/useOpenRouterGenerationRuntime.ts`: OpenRouter generation entry wiring over busy state and generation actions.
- `src/app/useOpenRouterGenerationActions.ts`: browser-side OpenRouter generation UI action routing and direct-generation delegation.
- `src/app/useOpenRouterDirectGenerationRuntime.ts`: direct generation lifecycle owner for access/offline/model guards, job-plan request, job tracking, busy state, and direct failure handling.
- `src/app/useOpenRouterJobsRuntime.ts`: public OpenRouter job runtime state, job tracking, manual failure recording, and reset.
- `src/app/useOpenRouterJobPollingRuntime.ts`: OpenRouter job polling, terminal status settlement, generated-script validation, notices, error-session creation, and cleanup.
- `src/app/openRouterGenerationFailurePolicy.ts`: shared OpenRouter failure labels, notices, and transient/persistent error decisions.
- `src/app/useOpenRouterModelRuntime.ts`: OpenRouter model assignment/default resolution and refresh wiring.
- `src/app/useAdminWorkspaceProps.ts`: browser-side Admin workspace prop composition for local storage/session exports, profile access callbacks, auth headers, and model refresh wiring.
- `src/app/useLeaderboardWorkspaceProps.ts`: browser-side Leaderboard workspace prop composition for expand/collapse state, session snapshot actions, navigation callbacks, and display formatter wiring.
- `src/app/useTrainingSessionLifecycle.ts`: browser-side training lifecycle gates, setup locking, ready checklist derivation, and focused training action routing.
- `/training`: low-latency typing surface and session controls.
- Dedicated mobile typing performance harness: `e2e-training.html` mounts `src/e2e/trainingPerfHarness.tsx`; `e2e/training-mobile.spec.ts` runs it with Playwright's mobile Chrome profile through `npm run test:e2e:mobile`. GitHub CI enforces this guard after the production build and uploads Playwright trace, screenshot, and video artifacts only on failure.
- Adaptive Pace Layer Flow workspace: implementation map for the closed adaptive loop. Phase 1 / Generation owns the live OpenRouter Generate Training Session card, while the former benchmark/feedback cockpit dashboard tab no longer exists; adaptive data still feeds Training Mode, OpenRouter context/export behavior, Live Metrics diagnostics, IndexedDB persistence, and Supabase sync internally.
- OpenRouter workspace: OpenRouter API key, model selection, model test, and export/copy actions.
- Admin workspace: members, remote sessions, and local diagnostics.
- `localStorage`: small profile/sync/migration manifests, preferences, and small OpenRouter pointers only.
- `IndexedDB`: local working-copy sessions, tombstones, adaptive benchmarks, and adaptive feedback.
- Saved `finished` and `error` sessions are retained for 20 days by last activity (`telemetry.finishedAt`, then `updatedAt`, then `createdAt`); older completed/error sessions are removed from IndexedDB active payloads and synced as Supabase tombstones. `ready`, `running`, and `paused` sessions are preserved regardless of age.
- Finalized session rows are buffered for critical Supabase sync and sent with a best-effort `keepalive` flush during page exit, which reduces mobile/PWA cases where a submitted session remains a remote `ready` row.
- PWA shell: manifest and service worker.

Core TypeScript domain:

- `src/core/buildInfo.ts`: build metadata formatting for browser display.
- `src/core/languages.ts`: supported languages.
- `src/app/useAdaptiveRuntime.ts`: browser-side adaptive controller wiring, benchmark update dispatch, selected profile glue, live telemetry application, and session feedback orchestration.
- `ListeningTrainerPolicy`: pure profile-specific pedagogical policy that converts one `(inputMode, language)` benchmark, latest matching feedback, and user intent into a `ListeningTrainingPrescription` for next-session generation.
- `src/core/adaptive/adaptivePolicyLayers.ts`: nested runtime-versus-learning policy types shared by `ListeningTrainerPolicy` and OpenRouter prompt generation.
- `src/core/adaptive/continuousAdaptiveListening*.ts`, `runtimeSampleQualityGate.ts`, `adaptivePressureVector.ts`, `adaptivePacingOutputMapper.ts`, and `languageAdaptiveCalibration.ts`: continuous normalized adaptive brain, universal trace gate, pressure vector, output mapper, and comparable language calibration.
- `src/core/adaptive/listenerStateV3.ts`, `src/core/adaptive/listeningCycleInsightReportV3.ts`, and `src/core/adaptive/adaptiveUserSystemReportListeningCycleV3.ts`: Listening Cycle V3 diagnosis and report block for separating listening segmentation, reconstruction, typing mechanics, TTS environment constraints, continuous adaptive state, sample quality, calibration, and requested-vs-actual execution.
- `SemanticPhrasePlanner`: language-aware phrase boundaries.
- `AdaptiveDictationController`: rate, pause, replay, and chunk decisions.
- `AdaptiveInputLanguageBenchmarkService`: 20-day rolling profiles.
- `src/core/adaptive/benchmarkRejectedSampleDiagnostics.ts`: compact accepted/rejected benchmark sample summary by rejection reason.
- `sessionFeedback` and `benchmarkJson`: exports and diagnostics.
- `HistoricalPerformanceService`: prior-session profile input.
- `supabaseSync` and `profileScopedStorage`: profile-aware persistence.
- `liveMetrics`: today, 10-day, and 20-day recent views.

Server routes:

- `api/_supabaseProfile.js`: signed-in Supabase profile resolution.
- `api/_securityEvents.js`: shared server-side security event logging and `dicta_security_events` persistence.
- `api/admin/users.js`: admin-created users and access controls.
- `api/openrouter/*`: models, chat, durable jobs, access gating, active-job limits, and persistent rate limits.
- `vite.config.ts`: local-only middleware for transcription, local OpenRouter key UI, sidecar start/bootstrap, and local file inventory.

Supabase multiuser path:

- Supabase Auth: email/password users.
- `dicta_app_profiles`: role, active flag, quotas, OpenRouter access, assigned model.
- `dicta_sync_items`: session, benchmark, and feedback JSON rows.
- `dicta_openrouter_jobs`: durable generation jobs.
- `dicta_rate_limits`: server-side OpenRouter job throttling.
- `dicta_security_events`: server-side security audit events written through service-role routes only.
- RLS/helper functions: members see their own rows, admins can manage all rows.

Local-only services:

## Adaptive Brain Loop

See [Adaptive Listening Brain](./adaptive-listening-brain.md) and [Adaptive Training Cycle](./adaptive-training-cycle.md) for the full adaptive docs.

Short runtime loop:

1. A session source provides typed text or an OpenRouter script.
2. `SemanticPhrasePlanner` produces phrase boundaries and difficulty.
3. The active input engine plays TTS or generated local audio.
4. `LowLatencyTextarea` captures learner typing without per-keystroke React state.
5. Running training sessions throttle active-session persistence into the global `sessions` list so live typing and playback metrics do not re-render the full app tree on every sample; explicit controls and submit still flush the latest visible text.
6. Input telemetry adapters produce `LiveTelemetryFrame`.
7. `HistoricalPerformanceService` and the 20-day benchmark provide profile context.
8. `AdaptiveDictationController` emits a `PacingDecision`.
9. The input engine applies supported controls.
10. Benchmarks, feedback, and session data persist to IndexedDB and optionally Supabase; localStorage keeps only small manifests/preferences.

Important implementation details:

- The adaptive benchmark rolling window is 20 days.
- Saved-session retention is also 20 days for completed/error sessions, but it is a separate persistence policy from the 30-day tombstone window.
- Clients whose last successful Supabase sync is older than the 30-day tombstone window must full-refresh before pushing local rows.
- Browser TTS uses one conceptual adaptive cycle for all supported languages. Language differences are expressed as `LanguageAdaptiveCalibration`, not separate runtime pipelines.
- Runtime sample quality is universal: strict benchmark acceptance, looser session insight, telemetry learning, runtime pressure, and debug/explanation use are decided by the same gate for `en`, `es`, `de`, `fr`, and `pt`.
- Legacy `support`, `recovery`, `balanced`, and `flow` values can still appear in old data, report compatibility, and derived labels. They must not be used as the primary motor for rate, pause, chunk, boundary, or replay output.
- Browser TTS does not execute arbitrary phrase replay unless the input/runtime says replay is supported and the semantic boundary is safe; otherwise replay pressure becomes pause/chunk/reconstruction pressure.
- `ListeningTrainerPolicy` stays pure and profile-scoped.
- `ListeningTrainingPrescription` now exposes flat legacy fields plus nested `runtimePolicy` and `learningPolicy` views for runtime playback and next-script generation. Recommendation/prescription rate handling supports the broad product envelope `0.1-2.0`; Browser TTS execution applies separate voice/runtime safety caps.
- `useBrowserTtsPlaybackLoop` delegates to `browserTtsPlaybackLoopActions`, `browserTtsPlaybackLoopRunner`, and `browserTtsPlaybackLoopChunkSpeaker`; the chunk speaker owns one Browser TTS chunk execution.
- OpenRouter and other LLM paths generate structured training material only.
- OpenRouter adaptive prompts consume `trainingPrescription.runtimePolicy` and `trainingPrescription.learningPolicy`; runtime recovery should not cause harder learning content.
- Browser TTS benchmark samples and completed session feedback include a structured `ttsEnvironment` fingerprint.
- Browser TTS benchmark timelines can carry compact decision-trace metadata and rejection reasons for diagnostics.
- Listening Cycle V3 pauses use continuous `pauseMsTarget` as an adaptive intent signal, then Browser TTS resolves whether a pause is safe at the current boundary. Safe learner-facing pauses are completion-gated: the next chunk can start as soon as the current chunk is typed with tolerant matching, with a 4000 ms fallback to avoid blocking. Unsafe or incomplete boundaries defer pause pressure instead of creating unnatural wait points. Requested-vs-actual pause, deferred pause, and execution timing are reported.
- Adaptive user/system reports use schema v3 and include a top-level `listeningCycleV3` block for primary constraint, evidence, next-session knobs, contradiction notes, accessibility wording, continuous adaptive summary, sample quality, pressure vector, pacing output, calibration, and requested-vs-actual execution.

## Account And Access Model

Supabase Auth is the only hosted multiuser path. Accounts are invite/admin-created from the Admin workspace; there is no public self-signup flow in the repo.

Profile rules:

- `dicta_app_profiles` maps each Supabase user to one `profile_id`.
- Admins can read/manage all profiles and rows through RLS.
- Members can sync only their own rows.
- Members default to `session_limit = 15`, `can_access_openrouter = false`, and optional `assigned_openrouter_model = null`.

Removed legacy app gate:

- Hosted and PWA access must use Supabase Auth + RLS.
- The single-password app gate, password cookie, `public/login.html`, `/api/auth/login`, `/api/auth/logout`, and password middleware are removed.
- Server routes require a signed Supabase bearer session resolved through `api/_supabaseProfile.js`.

Verification test account:

- Local and remote app verification can use the invite/admin-created Supabase E2E test account from `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and `E2E_TEST_PROFILE_ID`.
- These vars are for agent/developer verification only. They are not Vite browser vars, and the password must not be committed, copied into docs/source, stored in `localStorage`, or exposed in screenshots/logs.
- If a task needs authenticated local or hosted testing, try this account before blocking on missing credentials, and confirm both Supabase sign-in and `dicta_app_profiles` loading.

## Persistence And Sync

Primary browser storage owners:

- IndexedDB `dicta-local.sessions`
- IndexedDB `dicta-local.syncTombstones`
- IndexedDB `dicta-local.adaptiveBenchmarks`
- IndexedDB `dicta-local.adaptiveSessionFeedback`
- localStorage `dicta.supabaseSyncManifest.v1`
- localStorage `dicta.indexedDbMigration.v1`
- `dicta.perfDiagnostics.v1`
- `dicta.openrouterDefaultModel.v1`
