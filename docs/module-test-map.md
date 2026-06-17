# Module Test Map

Updated: 2026-06-17 after OpenRouter job route test split and runtime modularization.  
Verified branch: `product/input-2`.

Use the narrowest relevant validation before broad validation.

## Commands

| Scope | Command |
| --- | --- |
| All tests | `npm test` |
| Build | `npm run build` |
| Lint | `npm run lint` |

## Core runtime

| Area | Tests |
| --- | --- |
| App shell / runtime root | `tests/dictaAppRuntimeBoundary.test.ts`, `tests/dictaAppRuntimeRootOpenRouterBoundary.test.ts`, `tests/dictaAppRuntimeRootRouteCompositionBoundary.test.ts` |
| Route rendering | `tests/appRouteRenderer.test.ts`, `tests/appPresentationRuntime.test.ts`, `tests/adaptiveWorkspaceRouteRuntime.test.ts` |
| Focused training / TTS | `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/useActiveSessionStateSync.test.ts`, `tests/focusedTrainingPresentation.test.ts`, `tests/useTtsPlaybackControls.test.ts`, `tests/useResetSessionRuntime.test.ts`, `tests/useTtsSessionSubmitAction.test.ts` |
| Session persistence/sync | `tests/useSessionPersistenceSync.test.ts`, `tests/supabaseSync.test.ts`, `tests/profileScopedStorage.test.ts`, `tests/sessionStorage.test.ts` |
| Profile runtime | `tests/appProfiles.test.ts`, `tests/supabaseProfileRoute.test.ts`, `tests/profileScopedStorage.test.ts` |

## OpenRouter

| Area | Tests |
| --- | --- |
| Root runtime | `tests/dictaAppRuntimeRootOpenRouterBoundary.test.ts`, `tests/dictaOpenRouterRuntimeBoundary.test.ts` |
| Model runtime | `tests/workspaceModelRefreshRuntime.test.ts`, `tests/config.test.ts` |
| Direct generation | `tests/openRouterDirectGenerationRuntimeBoundary.test.ts`, `tests/openRouterDirectGenerationPresetActionsBoundary.test.ts`, `tests/openRouterDirectGenerationStartPlan.test.ts`, `tests/openRouterDirectGenerationJobPlan.test.ts`, `tests/openRouterDirectGenerationPresets.test.ts` |
| Jobs polling/settlement | `tests/useOpenRouterJobsRuntime.test.ts`, `tests/openRouterJobs.test.ts`, `tests/openRouterGeneratedScriptSettlement.test.ts` |
| Workspace runtime helpers | `tests/openRouterJobs.test.ts`, `tests/openRouterGenerationJobRequest.test.ts`, `tests/openRouterGenerationPrompt.test.ts`, `tests/trainingOpenRouterLanguageContract.test.ts`, `tests/openRouterViewHelpers.test.ts` |
| Jobs route helpers | `tests/openRouterJobRoutePayload.test.ts`, `tests/openRouterJobRouteModels.test.ts`, `tests/openRouterJobRouteSessionJson.test.ts`, `tests/openRouterJobRouteProviderErrors.test.ts`, `tests/openRouterJobs.test.ts`, `tests/openRouterGenerationJobRequest.test.ts` |

## Browser TTS

| Area | Tests |
| --- | --- |
| Runtime/playback | `tests/useBrowserTtsRuntime.test.ts`, `tests/browserTtsPlaybackLoopContract.test.ts`, `tests/browserTtsUtteranceConfigurationContract.test.ts`, `tests/mockSpeechSynthesisHarness.test.ts`, `tests/browserTtsPlaybackPlan.test.ts`, `tests/browserTtsPlaybackStartPlan.test.ts`, `tests/browserTtsUnexpectedErrorPlan.test.ts`, `tests/useTtsPlaybackControls.test.ts` |
| Submit/finalization | `tests/useTtsSessionSubmitAction.test.ts`, `tests/ttsSessionFinalization.test.ts` |
| Metrics/telemetry/UI | `tests/useTtsTelemetryRecorder.test.ts`, `tests/useTtsUiPublisher.test.ts`, `tests/useTtsPlaybackProgressEstimator.test.ts`, `tests/useTtsPerformanceSampler.test.ts` |

## Adaptive / presentation

| Area | Tests |
| --- | --- |
| Adaptive runtime/controller/policy | `tests/dictaAppRuntimeRootAdaptiveBoundary.test.ts`, `tests/adaptiveController.test.ts`, `tests/adaptiveControllerReasonCodes.test.ts`, `tests/adaptiveSemantic.test.ts`, `tests/listeningTrainerPolicy.test.ts`, `tests/inputLanguageBenchmarkRecommendationHysteresis.test.ts` |
| Adaptive benchmark/workspace | `tests/adaptiveBenchmarkService.test.ts`, `tests/adaptiveExportPackages.test.ts`, `tests/sessionFeedbackAdaptive.test.ts`, `tests/adaptiveWorkspacePresentation.test.ts`, `tests/adaptiveBenchmarkCockpitBoundary.test.ts`, `tests/adaptiveWorkspaceRouteRuntime.test.ts` |

## Other areas

| Area | Tests |
| --- | --- |
| Performance diagnostics | `tests/perfDiagnostics.test.ts`, `tests/lowLatencyPerformanceGate.test.ts`, `tests/lowLatencyTextarea.test.ts` |
| Low latency textarea | `tests/LowLatencyTextareaContract.test.ts`, `tests/lowLatencyTextarea.test.ts` |
| Scoring/status/device | `tests/sessionScore.test.ts`, `tests/sessionStatusNormalization.test.ts`, `tests/sessionDevice.test.ts` |
| Config/languages/build info | `tests/config.test.ts`, `tests/languages.test.ts`, `tests/buildInfo.test.ts` |

## Maintenance

When adding or moving a module, update this file in the same patch.
