# Module Test Map

This document maps important Dicta modules and runtime areas to the tests that protect them.

Use this before changing code so validation starts with the narrowest relevant tests.

Updated: 2026-06-15 after OpenRouter direct generation, job polling, and failure-policy extraction.
Verified against branch: `product/input-2`.

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
| `src/App.tsx` | Main app shell and composition root. App wires auth/profile, sync, workspace routing, OpenRouter, focused training, presentation props, and route rendering. | Use area-specific tests below. |
| `src/app/AppRouteRenderer.tsx` | Route-level render branching for auth, focused training, workspace, dashboard, adaptive, OpenRouter, Admin, Leaderboard, and fallbacks. | Use touched surface tests; include training/header/workspace tests when route rendering changes. |
| `src/app/useFocusedTrainingRuntime.ts` | Focused-training composition runtime and TTS handoff. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/useActiveSessionStateSync.test.ts`, `tests/focusedTrainingPresentation.test.ts`, `tests/focusedTrainingInputTelemetry.test.ts` |
| `src/app/useTtsSessionOrchestrationRuntime.ts` | TTS orchestration: keyboard remap, practice input, metrics, playback loop, controls, reset, and submit. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/useKeyboardRemapRuntime.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTtsPerformanceSampler.test.ts`, `tests/useResetSessionRuntime.test.ts`, `tests/useTtsSessionSubmitAction.test.ts` |
| `src/app/useTrainingRuntimeState.ts` | Training state bucket used by App before focused/runtime handoff. | Use downstream focused-training, TTS, and lifecycle tests. |
| `src/app/useActiveSessionStateSync.ts` | Active-session hydration, finished-session state sync, and live-session persistence state sync. | `tests/useActiveSessionStateSync.test.ts`, `tests/activeSessionHydration.test.ts`, `tests/sessionStatusNormalization.test.ts` |
| `src/app/activeSessionHydration.ts` | Pure active-session hydration state builder. | `tests/activeSessionHydration.test.ts` |
| `src/app/resetSessionState.ts` | Pure reset-session default state construction. | `tests/resetSessionState.test.ts` |
| `src/app/useResetSessionRuntime.ts` | Reset-session side-effect sequencing. | `tests/useResetSessionRuntime.test.ts`, `tests/resetSessionState.test.ts`, `tests/useTrainingSessionLifecycle.test.ts` |
| `src/app/sessionStorage.ts` | Session storage, restore, and persistence helpers. | `tests/sessionStorage.test.ts` |
| `src/app/useSessionPersistenceRuntime.ts` | App-level persistence runtime. | `tests/useSessionPersistenceSync.test.ts`, `tests/supabaseSync.test.ts`, `tests/profileScopedStorage.test.ts`, `tests/sessionStorage.test.ts` |
| `src/app/useSessionPersistenceSync.ts` | Session persistence/sync lifecycle. | `tests/useSessionPersistenceSync.test.ts` |
| `src/app/useSessionCreationRuntime.ts` | Session creation state/actions for plain text, DictationScript import, and generated scripts. | `tests/dictationScriptValidation.test.ts`, `tests/trainingGenerationCard.test.ts`, `tests/trainingNotifications.test.ts` |
| `src/app/useWorkspaceSessionRuntime.ts` | Workspace-level derived session collections and actions. | `tests/leaderboardWorkspace.test.ts`, `tests/useSessionWorkspaceActions.test.ts`, `tests/sessionStorage.test.ts` |
| `src/app/useWorkspaceRouting.ts` | Workspace route state and navigation helpers. | `tests/useWorkspaceRouting.test.ts` |
| `src/app/useWorkspaceNavigationEffects.ts` | Workspace navigation effects. | `tests/useWorkspaceNavigationEffects.test.ts` |
| `src/app/useWorkspaceModelRefreshRuntime.ts` | Resolves assigned/effective OpenRouter workspace model and delegates refresh actions. | `tests/workspaceModelRefreshRuntime.test.ts` |
| `src/app/useAuthProfileRuntime.ts` | Auth/profile runtime. | `tests/appProfiles.test.ts`, `tests/supabaseProfileRoute.test.ts`, `tests/profileScopedStorage.test.ts` |
| `src/app/useKeyboardRemapRuntime.ts` | Keyboard remap runtime. | `tests/useKeyboardRemapRuntime.test.ts` |
| `src/app/useOpenRouterModelRuntime.ts` | OpenRouter model assignment/default resolution and refresh wiring. | `tests/workspaceModelRefreshRuntime.test.ts`, `tests/config.test.ts` |
| `src/app/useOpenRouterGenerationRuntime.ts` | OpenRouter generation entry wiring. | OpenRouter tests below. |
| `src/app/useOpenRouterGenerationActions.ts` | Opens generation UI and delegates direct generation actions. | `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` |
| `src/app/useOpenRouterDirectGenerationRuntime.ts` | Direct generation lifecycle: guards, job request, tracking, busy state, and direct failure handling. | `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` |
| `src/app/useOpenRouterJobsRuntime.ts` | Public OpenRouter job runtime state, tracking, manual failure recording, and reset. | `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterJobs.test.ts` |
| `src/app/useOpenRouterJobPollingRuntime.ts` | OpenRouter job polling, settlement, generated-script validation, notices, error-session creation, and cleanup. | `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterJobs.test.ts`, `tests/openRouterJobRoute.test.ts` |
| `src/app/useOpenRouterGeneratedScriptSettlement.ts` | Handles generated-script settlement after an OpenRouter job completes: creates the generated session and shows the ready notification. | `tests/openRouterGeneratedScriptSettlement.test.ts`, `tests/trainingNotifications.test.ts` |
| `src/components/openrouter/useOpenRouterWorkspaceRuntime.ts` | OpenRouter workspace state, derived payloads, export helpers, generation slot persistence, and custom workspace job request actions. | `tests/openRouterJobs.test.ts`, `tests/openRouterGenerationJobRequest.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` |
| `src/app/openRouterGenerationFailurePolicy.ts` | Shared OpenRouter failure labels, notices, and transient/persistent error decisions. | `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterJobs.test.ts`, `tests/useOpenRouterJobsRuntime.test.ts` |
| `src/app/openRouterDirectGenerationJobPlan.ts` | OpenRouter direct generation job planning. | `tests/openRouterDirectGenerationJobPlan.test.ts` |
| `src/app/openRouterDirectGenerationPresets.ts` | OpenRouter direct generation presets. | `tests/openRouterDirectGenerationPresets.test.ts` |
| `src/app/useTrainingSessionLifecycle.ts` | Training lifecycle controls and focused-training action wiring. | `tests/useTrainingSessionLifecycle.test.ts` |
| `src/app/useSessionWorkspaceActions.ts` | Session workspace actions. | `tests/useSessionWorkspaceActions.test.ts` |
| `src/app/useAppPresentationRuntime.ts` | App-level presentation prop composition. | Use touched surface tests. |
| `src/app/adaptiveExportPackages.ts` | Adaptive export package builders. | `tests/adaptiveExportPackages.test.ts` |
| `src/app/adaptiveWorkspacePresentation.ts` | Adaptive workspace presentation derivations. | `tests/adaptiveWorkspacePresentation.test.ts` |
| `src/app/focusedTrainingPresentation.ts` | Focused training presentation derivations. | `tests/focusedTrainingPresentation.test.ts` |
| `src/app/focusedTrainingInputTelemetry.ts` | Focused training immediate-input telemetry helpers. | `tests/focusedTrainingInputTelemetry.test.ts` |

## Browser TTS runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/app/useBrowserTtsRuntime.ts` | Browser TTS app runtime integration. | `tests/useBrowserTtsRuntime.test.ts` |
| `src/app/useBrowserTtsPlaybackLoop.ts` | Browser TTS playback loop ownership. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/browserTtsUtteranceConfigurationContract.test.ts`, `tests/mockSpeechSynthesisHarness.test.ts`, `tests/browserTtsPlaybackPlan.test.ts`, `tests/browserTtsPlaybackStartPlan.test.ts`, `tests/browserTtsUnexpectedErrorPlan.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsSessionSubmitAction.ts` | Browser TTS submit orchestration. | `tests/useTtsSessionSubmitAction.test.ts`, `tests/ttsSessionFinalization.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsPlaybackControls.ts` | Browser TTS pause/resume/stop/seek controls. | `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsPlaybackMetricsRuntime.ts` | TTS telemetry recorder, UI publisher, progress estimator, and performance sampler composition. | `tests/useTtsTelemetryRecorder.test.ts`, `tests/useTtsUiPublisher.test.ts`, `tests/useTtsPlaybackProgressEstimator.test.ts`, `tests/useTtsPerformanceSampler.test.ts` |
| `src/app/useTtsPerformanceSampler.ts` | Browser TTS performance sampling. | `tests/useTtsPerformanceSampler.test.ts` |
| `src/app/useTtsTelemetryRecorder.ts` | Browser TTS attempt/chunk telemetry. | `tests/useTtsTelemetryRecorder.test.ts` |
| `src/app/useTtsUiPublisher.ts` | Browser TTS live metric UI publication. | `tests/useTtsUiPublisher.test.ts` |
| `src/app/useTtsPlaybackProgressEstimator.ts` | Browser TTS spoken-word progress estimation. | `tests/useTtsPlaybackProgressEstimator.test.ts` |
| `src/app/useBrowserTtsSetupCardProps.ts` | Browser TTS setup card prop composition. | `tests/browserTtsSetupCardProps.test.ts` |
| `src/app/browserTtsSessionEnvironment.ts` | Browser TTS session voice/environment metadata helpers. | `tests/browserTtsSessionEnvironment.test.ts` |
| `src/app/browserTtsPlaybackPlan.ts` | Pure Browser TTS next-chunk playback planning. | `tests/browserTtsPlaybackPlan.test.ts` |
| `src/app/browserTtsPlaybackStartPlan.ts` | Browser TTS playback start-plan preparation. | `tests/browserTtsPlaybackStartPlan.test.ts` |
| `src/app/browserTtsAdaptiveSemanticDebug.ts` | Pure Browser TTS semantic debug builders. | `tests/browserTtsAdaptiveSemanticDebug.test.ts` |
| `src/app/browserTtsPhraseCompletionTelemetry.ts` | Pure Browser TTS phrase-completion telemetry payload construction. | `tests/browserTtsPhraseCompletionTelemetry.test.ts` |
| `src/app/ttsSessionFinalization.ts` | Pure TTS session finalization state construction. | `tests/ttsSessionFinalization.test.ts` |
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
| Training UI and generation UI | Training UI, generation card, header, notifications, and script validation. | `tests/trainingGenerationCard.test.ts`, `tests/trainingHeader.test.ts`, `tests/trainingNotifications.test.ts`, `tests/dictationScriptValidation.test.ts` |
| OpenRouter routes/jobs | OpenRouter API routes, job helpers/state, runtime, direct generation plans, presets, failure policy, and language contract. | `tests/openRouterChatRoute.test.ts`, `tests/openRouterJobRoute.test.ts`, `tests/openRouterJobs.test.ts`, `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` |
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
2. If changing OpenRouter direct generation, run `npx vitest run tests/openRouterGenerationJobRequest.test.ts tests/openRouterDirectGenerationJobPlan.test.ts tests/openRouterDirectGenerationPresets.test.ts tests/trainingOpenRouterLanguageContract.test.ts`.
3. If changing OpenRouter job polling or failure policy, run `npx vitest run tests/openRouterJobs.test.ts tests/useOpenRouterJobsRuntime.test.ts tests/openRouterJobRoute.test.ts tests/openRouterGenerationJobRequest.test.ts`.
4. If changing Browser TTS policy modules, run the matching `browserTts*.test.ts` file first.
5. If changing `src/app/useBrowserTtsPlaybackLoop.ts`, run `npx vitest run tests/browserTtsPlaybackLoopContract.test.ts tests/browserTtsUtteranceConfigurationContract.test.ts tests/mockSpeechSynthesisHarness.test.ts tests/useTtsPlaybackControls.test.ts tests/browserTtsPlaybackPlan.test.ts tests/browserTtsPlaybackStartPlan.test.ts tests/browserTtsUnexpectedErrorPlan.test.ts`.
6. If changing `src/app/useTtsSessionOrchestrationRuntime.ts`, run `npx vitest run tests/browserTtsPlaybackLoopContract.test.ts tests/useResetSessionRuntime.test.ts tests/useTtsSessionSubmitAction.test.ts tests/useTtsPlaybackControls.test.ts tests/useTtsPerformanceSampler.test.ts`.
7. If changing Supabase sync or session persistence, run `npx vitest run tests/supabaseSync.test.ts tests/useSessionPersistenceSync.test.ts tests/profileScopedStorage.test.ts`.
8. If changing mobile/PWA flow behavior, run focused unit tests first, then `npm run test:e2e:mobile`.

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
| `src/components/adaptive-workspace/useAdaptiveBenchmarkCockpitRuntime.ts` | Adaptive benchmark cockpit derived state, diagnostics, export payloads, clipboard state, focus handling, and subsection expansion state. | `tests/adaptiveBenchmarkService.test.ts`, `tests/adaptiveExportPackages.test.ts`, `tests/sessionFeedbackAdaptive.test.ts`, `tests/adaptiveWorkspacePresentation.test.ts` |
| `src/components/adaptive-workspace/AdaptiveBenchmarkCockpit.tsx` | Selected adaptive benchmark profile cockpit visual layout: hero, exports, KPIs, coach charts, latest feedback, diagnostics, and timeline. | `tests/adaptiveWorkspacePresentation.test.ts`, `tests/adaptiveExportPackages.test.ts`, `tests/trainingGenerationCard.test.ts` |
| `src/core/adaptive/browserTtsDeBenchmarkPolicy.ts` | Browser TTS German benchmark policy: scoring sample filters, rejection reasons, diagnostics, timeline pressure fallback, recommendation clamp, and semantic counters. | `tests/adaptiveBenchmarkService.test.ts`, `tests/browserTtsAdaptiveProfiles.test.ts`, `tests/browserTtsAdaptiveSemanticDebug.test.ts`, `tests/pacingReasonCodes.test.ts` |
