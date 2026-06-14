# Module Test Map

This document maps important Dicta modules and runtime areas to the tests that protect them.

Use this before changing code so validation starts with the narrowest relevant tests.

## Validation scripts

| Scope | Command |
| --- | --- |
| All Vitest tests | `npm test` |
| Watch mode | `npm run test:watch` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Mobile E2E | `npm run test:e2e:mobile` |

## App shell and workspace runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/App.tsx` | Main app shell and composition root. App wires Browser TTS state, refs, callbacks, and hooks; it no longer owns `playTtsFromWord` directly. | Use area-specific tests below based on the touched boundary. |
| `src/app/useActiveSessionStateSync.ts` | Active-session hydration, finished-session state sync, and live-session persistence state sync. | `tests/useActiveSessionStateSync.test.ts`, `tests/activeSessionHydration.test.ts`, `tests/sessionStatusNormalization.test.ts` |
| `src/app/activeSessionHydration.ts` | Pure active-session hydration state builder. | `tests/activeSessionHydration.test.ts` |
| `src/app/resetSessionState.ts` | Pure reset-session default state construction. | `tests/resetSessionState.test.ts` |
| `src/app/sessionStorage.ts` | Session storage, restore, and persistence helpers. | `tests/sessionStorage.test.ts` |
| `src/app/useSessionPersistenceSync.ts` | Session persistence/sync lifecycle. | `tests/useSessionPersistenceSync.test.ts` |
| `src/app/useWorkspaceRouting.ts` | Workspace route state and navigation helpers. | `tests/useWorkspaceRouting.test.ts` |
| `src/app/useWorkspaceNavigationEffects.ts` | Workspace navigation effects. | `tests/useWorkspaceNavigationEffects.test.ts` |
| `src/app/useWorkspaceModelRefreshRuntime.ts` | Resolves assigned/effective OpenRouter workspace model and delegates refresh actions. | `tests/workspaceModelRefreshRuntime.test.ts` |
| `src/app/useKeyboardRemapRuntime.ts` | Keyboard remap runtime and input remapping behavior. | `tests/useKeyboardRemapRuntime.test.ts` |
| `src/app/useOpenRouterJobsRuntime.ts` | OpenRouter job polling/runtime behavior. | `tests/useOpenRouterJobsRuntime.test.ts` |
| `src/app/useTrainingSessionLifecycle.ts` | Training lifecycle controls and focused-training action wiring. | `tests/useTrainingSessionLifecycle.test.ts` |
| `src/app/useSessionWorkspaceActions.ts` | Session workspace actions. | `tests/useSessionWorkspaceActions.test.ts` |
| `src/app/adaptiveExportPackages.ts` | Adaptive export package builders. | `tests/adaptiveExportPackages.test.ts` |
| `src/app/adaptiveWorkspacePresentation.ts` | Adaptive workspace presentation derivations. | `tests/adaptiveWorkspacePresentation.test.ts` |
| `src/app/openRouterDirectGenerationJobPlan.ts` | OpenRouter direct generation job planning. | `tests/openRouterDirectGenerationJobPlan.test.ts` |
| `src/app/openRouterDirectGenerationPresets.ts` | OpenRouter direct generation presets. | `tests/openRouterDirectGenerationPresets.test.ts` |
| `src/app/focusedTrainingPresentation.ts` | Focused training presentation derivations for TTS player progress, source labels, placeholders, and message tone. | `tests/focusedTrainingPresentation.test.ts` |
| `src/app/focusedTrainingInputTelemetry.ts` | Focused training immediate-input telemetry initialization and live-text ref updates. | `tests/focusedTrainingInputTelemetry.test.ts` |

## Browser TTS runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/app/useBrowserTtsRuntime.ts` | Browser TTS app runtime integration. | `tests/useBrowserTtsRuntime.test.ts` |
| `src/app/useBrowserTtsPlaybackLoop.ts` | Browser TTS `playTts` / `playTtsFromWord` loop ownership: start validation, start planning, utterance creation/configuration, handlers, phrase progression, telemetry, adaptive benchmark writes, next-chunk scheduling, and completion transitions. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/browserTtsUtteranceConfigurationContract.test.ts`, `tests/mockSpeechSynthesisHarness.test.ts`, `tests/browserTtsPlaybackPlan.test.ts`, `tests/browserTtsPlaybackStartPlan.test.ts`, `tests/browserTtsUnexpectedErrorPlan.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsSessionSubmitAction.ts` | Browser TTS submit orchestration: validation, final sampling, finalized-session state, persistence push, playback stop, finished statuses, feedback completion, and submit message. | `tests/useTtsSessionSubmitAction.test.ts`, `tests/ttsSessionFinalization.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsPlaybackControls.ts` | Browser TTS pause/resume/stop/seek controls, runtime ref cleanup, action telemetry, and status transitions. | `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsPerformanceSampler.ts` | Browser TTS performance sampling, live metric publication, lag stabilization, telemetry samples/actions, and final metric packaging. | `tests/useTtsPerformanceSampler.test.ts` |
| `src/app/useTtsTelemetryRecorder.ts` | Browser TTS attempt telemetry initialization, elapsed-time calculation, control-action recording, and chunk telemetry recording. | `tests/useTtsTelemetryRecorder.test.ts` |
| `src/app/useTtsUiPublisher.ts` | Browser TTS live metric UI publication thresholds, throttling, ref updates, and visible metric setter routing. | `tests/useTtsUiPublisher.test.ts` |
| `src/app/useTtsPlaybackProgressEstimator.ts` | Browser TTS spoken-word progress estimation for active chunks, completed-word fallback, and finished playback. | `tests/useTtsPlaybackProgressEstimator.test.ts` |
| `src/app/useBrowserTtsSetupCardProps.ts` | Browser TTS setup card prop composition. | `tests/browserTtsSetupCardProps.test.ts` |
| `src/app/browserTtsSessionEnvironment.ts` | Browser TTS session voice/environment metadata helpers. | `tests/browserTtsSessionEnvironment.test.ts` |
| `src/app/browserTtsPlaybackPlan.ts` | Pure Browser TTS next-chunk playback planning: candidate chunk selection, adaptive decisions, runtime rate/unsafe/mobile/DE-recovery policies, telemetry frames, and rolling accuracy state updates. | `tests/browserTtsPlaybackPlan.test.ts` |
| `src/app/browserTtsPlaybackStartPlan.ts` | Browser TTS playback start-plan preparation: source words, semantic phrase indexing, start clamping, macro phrase offset, and initial playback loop defaults. | `tests/browserTtsPlaybackStartPlan.test.ts` |
| `src/app/browserTtsAdaptiveSemanticDebug.ts` | Pure Browser TTS semantic debug state builders. | `tests/browserTtsAdaptiveSemanticDebug.test.ts` |
| `src/app/browserTtsPhraseCompletionTelemetry.ts` | Pure Browser TTS phrase-completion benchmark telemetry payload construction for DE completion samples. | `tests/browserTtsPhraseCompletionTelemetry.test.ts` |
| `src/app/ttsSessionFinalization.ts` | Pure TTS session finalization state construction for `submitTtsSession`. | `tests/ttsSessionFinalization.test.ts` |
| `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts` | Browser TTS adaptive profile behavior. | `tests/browserTtsAdaptiveProfiles.test.ts` |
| `src/inputs/browserTts/browserTtsRatePolicy.ts` | Browser TTS rate policy. | `tests/browserTtsRatePolicy.test.ts` |
| `src/inputs/browserTts/browserTtsRecoveryPolicy.ts` | Browser TTS recovery policy. | `tests/browserTtsRecoveryPolicy.test.ts` |
| `src/inputs/browserTts/browserTtsUnsafePolicy.ts` | Browser TTS unsafe voice/policy handling. | `tests/browserTtsUnsafePolicy.test.ts` |
| `src/inputs/browserTts/browserTtsVoices.ts` | Browser TTS voice selection/normalization. | `tests/browserTtsVoices.test.ts` |
| `src/inputs/browserTts/ttsDynamicChunkPlanner.ts` | Dynamic TTS chunk planning. | `tests/ttsDynamicChunkPlanner.test.ts` |

## Other runtime areas

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `LowLatencyTextarea` | Low-latency textarea behavior and contract. | `tests/LowLatencyTextareaContract.test.ts`, `tests/lowLatencyTextarea.test.ts` |
| Typing performance gate | Guards against typing latency regressions. | `tests/lowLatencyPerformanceGate.test.ts` |
| Lag stability | Runtime lag stability expectations. | `tests/lagStability.test.ts` |
| Performance diagnostics | App performance diagnostics helpers. | `tests/perfDiagnostics.test.ts` |
| Adaptive controller | Adaptive training control behavior. | `tests/adaptiveController.test.ts` |
| Adaptive benchmark service | Benchmark service behavior. | `tests/adaptiveBenchmarkService.test.ts` |
| Adaptive semantic behavior | Semantic adaptive logic. | `tests/adaptiveSemantic.test.ts` |
| Semantic phrase planner | Phrase planning and semantic phrase behavior. | `tests/semanticPhrasePlanner.test.ts` |
| Listening trainer policy | Listening trainer policy decisions. | `tests/listeningTrainerPolicy.test.ts` |
| Listening precision metrics | Listening metric calculations. | `tests/listeningPrecisionMetrics.test.ts` |
| Session device metadata | Session device handling. | `tests/sessionDevice.test.ts` |
| Session feedback adaptive behavior | Adaptive session feedback. | `tests/sessionFeedbackAdaptive.test.ts` |
| Session scoring | Scoring calculations. | `tests/sessionScore.test.ts` |
| Session status normalization | Session status normalization. | `tests/sessionStatusNormalization.test.ts` |
| Profile-scoped storage | Storage scoped by profile/user. | `tests/profileScopedStorage.test.ts` |
| Supabase sync | Supabase sync behavior. | `tests/supabaseSync.test.ts` |
| App profiles | App profile behavior and role/profile assumptions. | `tests/appProfiles.test.ts` |
| Leaderboard workspace | Leaderboard workspace behavior. | `tests/leaderboardWorkspace.test.ts` |
| Training UI and generation UI | Training UI, generation card, header, notifications, and generated/imported script validation. | `tests/trainingGenerationCard.test.ts`, `tests/trainingHeader.test.ts`, `tests/trainingNotifications.test.ts`, `tests/dictationScriptValidation.test.ts` |
| OpenRouter routes/jobs | OpenRouter API routes, job helpers/state, runtime, direct generation plans, presets, and language contract. | `tests/openRouterChatRoute.test.ts`, `tests/openRouterJobRoute.test.ts`, `tests/openRouterJobs.test.ts`, `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` |
| Config, languages, and build info | App configuration, language metadata, and build info behavior. | `tests/config.test.ts`, `tests/languages.test.ts`, `tests/buildInfo.test.ts` |

## Mobile and PWA validation

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| Mobile training flow | Mobile training behavior and regressions. | `e2e/training-mobile.spec.ts` |
| PWA/mobile performance | Device-specific performance and install behavior. | Start with focused unit/perf tests, then run `npm run test:e2e:mobile` when flow-level behavior is affected. |

## Choosing validation

Use the smallest relevant validation first.

Examples:

1. If changing `src/app/useWorkspaceModelRefreshRuntime.ts`, run `npx vitest run tests/workspaceModelRefreshRuntime.test.ts`.
2. If changing OpenRouter direct generation planning, run `npx vitest run tests/openRouterDirectGenerationJobPlan.test.ts tests/openRouterDirectGenerationPresets.test.ts`.
3. If changing Browser TTS policy modules, run the matching `browserTts*.test.ts` file first.
4. If changing `src/app/useBrowserTtsPlaybackLoop.ts`, run `npx vitest run tests/browserTtsPlaybackLoopContract.test.ts tests/browserTtsUtteranceConfigurationContract.test.ts tests/mockSpeechSynthesisHarness.test.ts tests/useTtsPlaybackControls.test.ts tests/browserTtsPlaybackPlan.test.ts tests/browserTtsPlaybackStartPlan.test.ts tests/browserTtsUnexpectedErrorPlan.test.ts`.
5. If changing Supabase sync or session persistence, run `npx vitest run tests/supabaseSync.test.ts tests/useSessionPersistenceSync.test.ts`.
6. If changing mobile/PWA flow behavior, run focused unit tests first, then `npm run test:e2e:mobile`.

## Gaps and maintenance

When adding a new module:

1. Add or identify its focused test.
2. Add the module/test relationship here.
3. Prefer direct tests for pure helpers.
4. Avoid relying only on broad app-level tests for fragile runtime behavior.

When renaming or moving tests:

1. Update this document in the same commit.
2. Check `docs/README.md`.
3. Check `docs/agent-onboarding.md`.
4. Check `docs/documentation-inventory.md` if the documentation status changes.

## ROI scoring and validation

Use `docs/modularization-roi.md` to decide whether a modularization candidate has enough payoff. This map supplies the validation side of that score: existing tests, required test additions, and risk-specific commands.
