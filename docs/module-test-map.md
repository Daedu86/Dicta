# Module Test Map

This document maps important Dicta modules and runtime areas to the tests that protect them.

Use this before changing code so validation starts with the narrowest relevant tests.

Updated: 2026-06-16 after runtime modularization wave.  
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
| `src/App.tsx` | Shell-only React entrypoint. It imports `App.css` and renders `DictaAppRuntime`. | Use touched runtime/route tests; do not add runtime behavior here. |
| `src/app/DictaAppRuntime.tsx` | Runtime export shim for `DictaAppRuntimeRoot`; it should stay behavior-free. | `tests/dictaAppRuntimeBoundary.test.ts` |
| `src/app/DictaAppRuntimeRoot.tsx` | Main browser composition root for auth/profile, sync, workspace routing, root OpenRouter, focused training, presentation props, and route rendering. | `tests/dictaAppRuntimeBoundary.test.ts`, `tests/dictaAppRuntimeRootOpenRouterBoundary.test.ts`, `tests/dictaAppRuntimeRootRouteCompositionBoundary.test.ts`, touched area tests below. |
| `src/app/useDictaAppBootRuntime.ts` | Root boot-state boundary for perf diagnostics, sessions, training state, routing, theme, Browser TTS, and root refs. | `tests/dictaAppRuntimeBoundary.test.ts`, touched runtime tests for changed state buckets. |
| `src/app/AppRouteRenderer.tsx` | Route-level render branching. | `tests/appRouteRenderer.test.ts`, touched workspace/training tests. |
| `src/app/useDictaRootRouteCompositionRuntime.ts` | Root route-composition adapter that delegates to `useDictaAppRouteCompositionRuntime`. | `tests/dictaAppRuntimeRootRouteCompositionBoundary.test.ts`, `tests/appRouteRenderer.test.ts`, `tests/appPresentationRuntime.test.ts` |
| `src/app/useDictaAppRouteCompositionRuntime.ts` | Composes adaptive route props and app presentation props for `AppRouteRenderer`. | `tests/appRouteRenderer.test.ts`, `tests/appPresentationRuntime.test.ts`, `tests/adaptiveWorkspaceRouteRuntime.test.ts` |
| `src/app/useAppPresentationRuntime.ts` | App-level presentation prop composition. | `tests/appPresentationRuntime.test.ts`, touched route/workspace tests. |
| `src/app/useFocusedTrainingRuntime.ts` | Focused-training composition runtime and TTS handoff. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/useActiveSessionStateSync.test.ts`, `tests/focusedTrainingPresentation.test.ts`, `tests/focusedTrainingInputTelemetry.test.ts` |
| `src/app/useTtsSessionOrchestrationRuntime.ts` | TTS orchestration: keyboard remap, practice input, metrics, playback loop, controls, reset, and submit. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/useKeyboardRemapRuntime.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useTtsPerformanceSampler.test.ts`, `tests/useResetSessionRuntime.test.ts`, `tests/useTtsSessionSubmitAction.test.ts` |
| `src/app/useAdaptiveRuntime.ts`, `src/app/adaptiveRuntime*.ts` | Adaptive runtime hook, public types, session utilities, and benchmark update builder. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/dictaAppRuntimeRootAdaptiveBoundary.test.ts`, `tests/dictaAppRuntimeBoundary.test.ts`, `tests/adaptiveController.test.ts`, `tests/adaptiveSemantic.test.ts` |
| `src/app/useTrainingRuntimeState.ts` | Training state bucket used by `useDictaAppBootRuntime` before focused/runtime handoff. | `tests/dictaAppRuntimeBoundary.test.ts`, downstream focused-training, TTS, and lifecycle tests. |
| `src/app/useActiveSessionStateSync.ts` | Active-session hydration, finished-session state sync, and live-session persistence state sync. | `tests/useActiveSessionStateSync.test.ts`, `tests/activeSessionHydration.test.ts`, `tests/sessionStatusNormalization.test.ts` |
| `src/app/sessionStorage.ts` | Session storage, restore, and persistence helpers. | `tests/sessionStorage.test.ts` |
| `src/app/sessionPersistence*.ts` | Pure persistence compaction, recovery, deleted IDs, pending critical rows, and keepalive planning. | Matching `tests/sessionPersistence*.test.ts`, `tests/useSessionPersistenceSync.test.ts`, `tests/supabaseSync.test.ts` when sync adjacency changes. |
| `src/app/useSessionPersistenceRuntime.ts` | App-level persistence runtime. | `tests/useSessionPersistenceSync.test.ts`, `tests/supabaseSync.test.ts`, `tests/profileScopedStorage.test.ts`, `tests/sessionStorage.test.ts` |
| `src/app/useSessionPersistenceSync.ts` | Session persistence/sync lifecycle; still high-risk enough to need characterization before extraction. | `tests/useSessionPersistenceSync.test.ts`, plus `tests/supabaseSync.test.ts` and `tests/profileScopedStorage.test.ts` if sync/profile behavior changes. |
| `src/app/useSessionCreationRuntime.ts` | Session creation state/actions for plain text, DictationScript import, and generated scripts. | `tests/dictationScriptValidation.test.ts`, `tests/trainingGenerationCard.test.ts`, `tests/trainingNotifications.test.ts` |
| `src/app/useWorkspaceSessionRuntime.ts` | Workspace-level derived session collections and actions. | `tests/leaderboardWorkspace.test.ts`, `tests/useSessionWorkspaceActions.test.ts`, `tests/sessionStorage.test.ts` |
| `src/app/useAuthProfileRuntime.ts` | Auth/profile runtime. | `tests/appProfiles.test.ts`, `tests/supabaseProfileRoute.test.ts`, `tests/profileScopedStorage.test.ts` |

## OpenRouter runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/app/useOpenRouterModelRuntime.ts` | OpenRouter model assignment/default resolution and refresh wiring. | `tests/workspaceModelRefreshRuntime.test.ts`, `tests/config.test.ts` |
| `src/app/useDictaRootOpenRouterRuntime.ts` | Root OpenRouter adapter. | `tests/dictaAppRuntimeRootOpenRouterBoundary.test.ts`, `tests/dictaOpenRouterRuntimeBoundary.test.ts` |
| `src/app/useDictaOpenRouterRuntime.ts` | Dicta-level OpenRouter composition. | `tests/dictaOpenRouterRuntimeBoundary.test.ts` |
| `src/app/useDictaOpenRouterJobsRuntime.ts` | Dicta-level OpenRouter jobs composition. | `tests/dictaOpenRouterRuntimeBoundary.test.ts`, `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterGeneratedScriptSettlement.test.ts` |
| `src/app/useOpenRouterGenerationRuntime.ts` | OpenRouter generation entry wiring. | `tests/dictaOpenRouterRuntimeBoundary.test.ts`, OpenRouter tests below. |
| `src/app/useOpenRouterGenerationActions.ts` | Opens generation UI and delegates direct generation actions. | `tests/openRouterGenerateWorkspacePlan.test.ts`, `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts` |
| `src/app/useOpenRouterDirectGenerationRuntime.ts` / runner / preset actions | Direct generation lifecycle and preset action wiring. | `tests/openRouterDirectGenerationRuntimeBoundary.test.ts`, `tests/openRouterDirectGenerationPresetActionsBoundary.test.ts`, `tests/openRouterDirectGenerationStartPlan.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts` |
| `src/app/useOpenRouterJobsRuntime.ts` / `useOpenRouterJobPollingRuntime.ts` | Public job state, polling, settlement, generated-script validation, notices, and cleanup. | `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterJobs.test.ts`, `tests/openRouterJobRoute.test.ts` |
| `src/app/useOpenRouterGeneratedScriptSettlement.ts` | Creates generated session and ready notification after an OpenRouter job completes. | `tests/openRouterGeneratedScriptSettlement.test.ts`, `tests/trainingNotifications.test.ts` |
| `src/app/openRouterGenerationFailurePolicy.ts` | Shared OpenRouter failure labels, notices, and transient/persistent error decisions. | `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterJobs.test.ts`, `tests/useOpenRouterJobsRuntime.test.ts` |
| `src/components/openrouter/useOpenRouterWorkspaceRuntime.ts`, `openRouterWorkspaceRuntimeHelpers.ts` | OpenRouter workspace state, derived payloads, prompt/export helpers, generation slot persistence, and custom workspace job request actions. | `tests/openRouterJobs.test.ts`, `tests/openRouterGenerationJobRequest.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts`, `tests/openRouterViewHelpers.test.ts` |

## Browser TTS runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/app/useBrowserTtsRuntime.ts` | Browser TTS app runtime integration. | `tests/useBrowserTtsRuntime.test.ts` |
| `src/app/useBrowserTtsPlaybackLoop.ts`, `browserTtsPlaybackLoop*.ts` | Browser TTS playback loop, start guard, ref reset, navigator info, utterance setup, telemetry, and next-chunk scheduling. | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/browserTtsUtteranceConfigurationContract.test.ts`, `tests/mockSpeechSynthesisHarness.test.ts`, `tests/browserTtsPlaybackPlan.test.ts`, `tests/browserTtsPlaybackStartPlan.test.ts`, `tests/browserTtsUnexpectedErrorPlan.test.ts`, `tests/browserTtsUnsafePolicy.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsSessionSubmitAction.ts` | Browser TTS submit orchestration. | `tests/useTtsSessionSubmitAction.test.ts`, `tests/ttsSessionFinalization.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsPlaybackControls.ts` | Browser TTS pause/resume/stop/seek controls. | `tests/useTtsPlaybackControls.test.ts` |
| `src/app/useTtsPlaybackMetricsRuntime.ts` | TTS telemetry recorder, UI publisher, progress estimator, and performance sampler composition. | `tests/useTtsTelemetryRecorder.test.ts`, `tests/useTtsUiPublisher.test.ts`, `tests/useTtsPlaybackProgressEstimator.test.ts`, `tests/useTtsPerformanceSampler.test.ts` |
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

## Adaptive and presentation runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/app/adaptiveExportPackages.ts` | Adaptive export package builders. | `tests/adaptiveExportPackages.test.ts` |
| `src/app/adaptiveWorkspacePresentation.ts` | Adaptive workspace presentation derivations. | `tests/adaptiveWorkspacePresentation.test.ts` |
| `src/app/focusedTrainingPresentation.ts` | Focused training presentation derivations. | `tests/focusedTrainingPresentation.test.ts` |
| `src/app/focusedTrainingInputTelemetry.ts` | Focused training immediate-input telemetry helpers. | `tests/focusedTrainingInputTelemetry.test.ts` |
| `src/components/session-dashboard/*` | Session dashboard shell, model, KPI, transcript review, and charts. | Full `npm test` if UI contract changes; start with touched dashboard/presentation tests when present. |
| `src/components/adaptive-workspace/useAdaptiveBenchmarkCockpitRuntime.ts` | Adaptive benchmark cockpit derived state, diagnostics, export payloads, clipboard state, focus handling, and subsection expansion state. | `tests/adaptiveBenchmarkService.test.ts`, `tests/adaptiveExportPackages.test.ts`, `tests/sessionFeedbackAdaptive.test.ts`, `tests/adaptiveWorkspacePresentation.test.ts` |
| `src/components/adaptive-workspace/AdaptiveBenchmarkCockpitView.tsx`, `AdaptiveBenchmark*Section.tsx` | Adaptive benchmark cockpit shell and presentational sections. | `tests/adaptiveBenchmarkCockpitBoundary.test.ts`, `tests/adaptiveWorkspacePresentation.test.ts`, `tests/adaptiveExportPackages.test.ts` |
| `src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx`, `AdaptiveAdvanced*Panel.tsx` | Adaptive advanced diagnostics shell and presentational panels. | `tests/adaptiveWorkspacePresentation.test.ts`, `tests/adaptiveWorkspaceRouteRuntime.test.ts`, touched adaptive diagnostics tests. |
| `src/core/adaptive/ListeningTrainerPolicy.ts`, `listeningTrainerPolicy*.ts` | Listening trainer policy decisions, signals, pacing, and guidance helpers. | `tests/listeningTrainerPolicy.test.ts` |
| `src/core/adaptive/AdaptiveDictationController.ts`, `adaptiveDictationController*.ts` | Adaptive controller state/hysteresis plus math, mode, precision, phrase, and reason helpers. | `tests/adaptiveController.test.ts`, `tests/adaptiveControllerReasonCodes.test.ts`, `tests/adaptiveSemantic.test.ts`, `tests/browserTtsPlaybackPlan.test.ts` |
| `src/core/adaptive/browserTtsDeBenchmarkPolicy.ts`, `browserTtsDeBenchmark*.ts` | Browser TTS German benchmark facade plus core, sample, diagnostics, pressure, and decision helpers. | `tests/adaptiveBenchmarkService.test.ts`, `tests/browserTtsAdaptiveProfiles.test.ts`, `tests/browserTtsAdaptiveSemanticDebug.test.ts`, `tests/pacingReasonCodes.test.ts`, `tests/browserTtsPlaybackPlan.test.ts` |

## Other runtime areas

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/core/perfDiagnostics.ts`, `perfDiagnostics*.ts` | Performance diagnostics facade, runtime, types, and utilities. | `tests/perfDiagnostics.test.ts`, `tests/lowLatencyPerformanceGate.test.ts`, `tests/lowLatencyTextarea.test.ts`, touched runtime tests. |
| `LowLatencyTextarea` | Low-latency textarea behavior and contract. | `tests/LowLatencyTextareaContract.test.ts`, `tests/lowLatencyTextarea.test.ts` |
| Lag stability | Runtime lag stability expectations. | `tests/lagStability.test.ts` |
| Adaptive benchmark service | Benchmark service behavior. | `tests/adaptiveBenchmarkService.test.ts` |
| Listening precision metrics | Listening metric calculations. | `tests/listeningPrecisionMetrics.test.ts` |
| Session scoring/status/device metadata | Scoring, status normalization, and device metadata. | `tests/sessionScore.test.ts`, `tests/sessionStatusNormalization.test.ts`, `tests/sessionDevice.test.ts` |
| Profile-scoped storage | Storage scoped by profile/user. | `tests/profileScopedStorage.test.ts` |
| Supabase sync | Supabase sync behavior. | `tests/supabaseSync.test.ts` |
| App profiles | App profile behavior and role/profile assumptions. | `tests/appProfiles.test.ts` |
| Leaderboard workspace | Leaderboard workspace behavior. | `tests/leaderboardWorkspace.test.ts` |
| Training UI and generation UI | Training UI, generation card, header, notifications, and script validation. | `tests/trainingGenerationCard.test.ts`, `tests/trainingHeader.test.ts`, `tests/trainingNotifications.test.ts`, `tests/dictationScriptValidation.test.ts` |
| Config, languages, and build info | App configuration, language metadata, and build info behavior. | `tests/config.test.ts`, `tests/languages.test.ts`, `tests/buildInfo.test.ts` |

## Mobile and PWA validation

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| Mobile training flow | Mobile training behavior and regressions. | `e2e/training-mobile.spec.ts` |
| PWA/mobile performance | Device-specific performance and install behavior. | Start with focused unit/perf tests, then run `npm run test:e2e:mobile` when flow-level behavior is affected. |

## Choosing validation

Use the smallest relevant validation first.

Examples:

1. If changing `src/app/DictaAppRuntimeRoot.tsx`, start with the root boundary tests, then the touched runtime area tests.
2. If changing `src/app/useBrowserTtsPlaybackLoop.ts`, run `npx vitest run tests/browserTtsPlaybackLoopContract.test.ts tests/browserTtsUtteranceConfigurationContract.test.ts tests/mockSpeechSynthesisHarness.test.ts tests/useTtsPlaybackControls.test.ts tests/browserTtsPlaybackPlan.test.ts tests/browserTtsPlaybackStartPlan.test.ts tests/browserTtsUnexpectedErrorPlan.test.ts`.
3. If changing Browser TTS policy modules, run the matching `browserTts*.test.ts` file first.
4. If changing adaptive controller/policy modules, run `npx vitest run tests/adaptiveController.test.ts tests/adaptiveControllerReasonCodes.test.ts tests/adaptiveSemantic.test.ts tests/listeningTrainerPolicy.test.ts` plus touched Browser TTS/adaptive benchmark tests.
5. If changing OpenRouter job polling or failure policy, run `npx vitest run tests/openRouterJobs.test.ts tests/useOpenRouterJobsRuntime.test.ts tests/openRouterJobRoute.test.ts tests/openRouterGenerationJobRequest.test.ts`.
6. If changing Supabase sync or session persistence, run `npx vitest run tests/supabaseSync.test.ts tests/useSessionPersistenceSync.test.ts tests/profileScopedStorage.test.ts`.
7. If changing performance diagnostics, run `npx vitest run tests/perfDiagnostics.test.ts tests/lowLatencyPerformanceGate.test.ts tests/lowLatencyTextarea.test.ts`.
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
