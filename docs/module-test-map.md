# Module Test Map

This document maps important Dicta modules and runtime areas to the tests that protect them.

Use this before changing code so that validation starts with the narrowest relevant tests.

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
| `src/App.tsx` | Main app shell and composition root. | Use area-specific tests below based on the touched boundary. |
| `src/app/useWorkspaceModelRefreshRuntime.ts` | Resolves assigned/effective OpenRouter workspace model and delegates refresh actions. | `tests/workspaceModelRefreshRuntime.test.ts` |
| `src/app/useKeyboardRemapRuntime.ts` | Keyboard remap runtime and input remapping behavior. | `tests/useKeyboardRemapRuntime.test.ts` |
| `src/app/useOpenRouterJobsRuntime.ts` | OpenRouter job polling/runtime behavior. | `tests/useOpenRouterJobsRuntime.test.ts` |
| `src/app/useSessionPersistenceSync.ts` | Session persistence/sync lifecycle. | `tests/useSessionPersistenceSync.test.ts` |
- `src/app/activeSessionHydration.ts` -> `tests/activeSessionHydration.test.ts`
- `src/app/useTrainingSessionLifecycle.ts` -> `tests/useTrainingSessionLifecycle.test.ts`
- `src/app/resetSessionState.ts` -> `tests/resetSessionState.test.ts`
- `src/app/sessionStorage.ts` -> `tests/sessionStorage.test.ts`
- `src/app/useWorkspaceRouting.ts` -> `tests/useWorkspaceRouting.test.ts`
- `src/app/useSessionWorkspaceActions.ts` -> `tests/useSessionWorkspaceActions.test.ts`
| `src/app/adaptiveExportPackages.ts` | Adaptive export package builders. | `tests/adaptiveExportPackages.test.ts` |
| `src/app/adaptiveWorkspacePresentation.ts` | Adaptive workspace presentation derivations for benchmark/profile selection, feedback selection, diagnostic options, latest mode, and adapter mapping. | `tests/adaptiveWorkspacePresentation.test.ts` |
| `src/app/openRouterDirectGenerationJobPlan.ts` | OpenRouter direct generation job planning. | `tests/openRouterDirectGenerationJobPlan.test.ts` |
| `src/app/openRouterDirectGenerationPresets.ts` | OpenRouter direct generation presets. | `tests/openRouterDirectGenerationPresets.test.ts` |
| `src/app/useBrowserTtsSetupCardProps.ts` | Browser TTS setup card prop composition. | `tests/browserTtsSetupCardProps.test.ts` |
| `src/app/useTtsTelemetryRecorder.ts` | Browser TTS attempt telemetry initialization, elapsed-time calculation, control-action recording, and chunk telemetry recording. | `tests/useTtsTelemetryRecorder.test.ts` |
| `src/app/useTtsUiPublisher.ts` | Browser TTS live metric UI publication thresholds, throttling, ref updates, and visible metric setter routing. | `tests/useTtsUiPublisher.test.ts` |
| `src/app/useTtsPlaybackProgressEstimator.ts` | Browser TTS spoken-word progress estimation for active chunks, completed-word fallback, and finished playback. | `tests/useTtsPlaybackProgressEstimator.test.ts` |
| `src/app/browserTtsPlaybackPlan.ts` | Pure Browser TTS next-chunk playback planning: candidate chunk selection, adaptive decision mapping, runtime rate/unsafe/mobile/DE-recovery policies, telemetry frames, and rolling accuracy state updates. | `tests/browserTtsPlaybackPlan.test.ts` |
| `src/app/browserTtsPlaybackStartPlan.ts` | Browser TTS playback start-plan preparation: source words, semantic phrase indexing, start clamping, macro phrase offset, and initial playback loop defaults. | `tests/browserTtsPlaybackStartPlan.test.ts` |
| `src/app/ttsSessionFinalization.ts` | Pure TTS session finalization state construction for `submitTtsSession`: target session replacement, finished status, updated timestamp, final metrics/telemetry, practice text, Browser TTS voice/environment metadata, and finalized-session lookup. | `tests/ttsSessionFinalization.test.ts` |
| `src/app/useTtsPerformanceSampler.ts` | Browser TTS performance sampling, live metric publication, lag stabilization, telemetry samples/actions, and final metric packaging. | `tests/useTtsPerformanceSampler.test.ts` |
| `src/app/useTtsPlaybackControls.ts` | Browser TTS pause/resume/stop/seek controls, runtime ref cleanup, action telemetry, and status transitions. | `tests/useTtsPlaybackControls.test.ts` |

## Input and Browser TTS runtime

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `src/app/useBrowserTtsRuntime.ts` | Browser TTS app runtime integration. | `tests/useBrowserTtsRuntime.test.ts` |
| `src/app/browserTtsSessionEnvironment.ts` | Browser TTS session voice/environment metadata helpers. | `tests/browserTtsSessionEnvironment.test.ts` |
| `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts` | Browser TTS adaptive profile behavior. | `tests/browserTtsAdaptiveProfiles.test.ts` |
| `src/inputs/browserTts/browserTtsRatePolicy.ts` | Browser TTS rate policy. | `tests/browserTtsRatePolicy.test.ts` |
| `src/inputs/browserTts/browserTtsRecoveryPolicy.ts` | Browser TTS recovery policy. | `tests/browserTtsRecoveryPolicy.test.ts` |
| `src/inputs/browserTts/browserTtsUnsafePolicy.ts` | Browser TTS unsafe voice/policy handling. | `tests/browserTtsUnsafePolicy.test.ts` |
| `src/inputs/browserTts/browserTtsVoices.ts` | Browser TTS voice selection/normalization. | `tests/browserTtsVoices.test.ts` |
| `src/inputs/browserTts/ttsDynamicChunkPlanner.ts` | Dynamic TTS chunk planning. | `tests/ttsDynamicChunkPlanner.test.ts` |

## Low-latency typing and performance

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| `LowLatencyTextarea` | Low-latency textarea behavior and contract. | `tests/LowLatencyTextareaContract.test.ts`, `tests/lowLatencyTextarea.test.ts` |
| Typing performance gate | Guards against typing latency regressions. | `tests/lowLatencyPerformanceGate.test.ts` |
| Lag stability | Runtime lag stability expectations. | `tests/lagStability.test.ts` |
| Performance diagnostics | App performance diagnostics helpers. | `tests/perfDiagnostics.test.ts` |

## Adaptive training and semantic planning

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| Adaptive controller | Adaptive training control behavior. | `tests/adaptiveController.test.ts` |
| Adaptive benchmark service | Benchmark service behavior. | `tests/adaptiveBenchmarkService.test.ts` |
| Adaptive semantic behavior | Semantic adaptive logic. | `tests/adaptiveSemantic.test.ts` |
| Adaptive user/system report | Adaptive report generation. | `tests/adaptiveUserSystemReport.test.ts` |
| Semantic phrase planner | Phrase planning and semantic phrase behavior. | `tests/semanticPhrasePlanner.test.ts` |
| Listening trainer policy | Listening trainer policy decisions. | `tests/listeningTrainerPolicy.test.ts` |
| Listening precision metrics | Listening metric calculations. | `tests/listeningPrecisionMetrics.test.ts` |

## Session lifecycle, scoring, and persistence

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| Session device metadata | Session device handling. | `tests/sessionDevice.test.ts` |
| Session feedback adaptive behavior | Adaptive session feedback. | `tests/sessionFeedbackAdaptive.test.ts` |
| Session feedback debug lag | Debug lag feedback behavior. | `tests/sessionFeedbackDebugLag.test.ts` |
| Session scoring | Scoring calculations. | `tests/sessionScore.test.ts` |
| Session status normalization | Session status normalization. | `tests/sessionStatusNormalization.test.ts` |
| Session persistence sync | Local/Supabase persistence sync. | `tests/useSessionPersistenceSync.test.ts` |
| Profile-scoped storage | Storage scoped by profile/user. | `tests/profileScopedStorage.test.ts` |

## OpenRouter routes/jobs

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| OpenRouter chat route | OpenRouter chat API route behavior. | `tests/openRouterChatRoute.test.ts` |
| OpenRouter job route | OpenRouter job API route behavior. | `tests/openRouterJobRoute.test.ts` |
| OpenRouter jobs | OpenRouter job helpers/state. | `tests/openRouterJobs.test.ts` |
| OpenRouter jobs runtime | App runtime for OpenRouter jobs. | `tests/useOpenRouterJobsRuntime.test.ts` |
| OpenRouter direct generation plan | Direct generation job planning. | `tests/openRouterDirectGenerationJobPlan.test.ts` |
| OpenRouter direct generation presets | Direct generation preset behavior. | `tests/openRouterDirectGenerationPresets.test.ts` |
| OpenRouter language contract | Training generation language contract. | `tests/trainingOpenRouterLanguageContract.test.ts` |

## Supabase, auth, profiles, and leaderboard

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| App profiles | App profile behavior and role/profile assumptions. | `tests/appProfiles.test.ts` |
| Supabase profile route | Supabase profile API route behavior. | `tests/supabaseProfileRoute.test.ts` |
| Supabase sync | Supabase sync behavior. | `tests/supabaseSync.test.ts` |
| Session persistence sync | Session persistence and sync integration. | `tests/useSessionPersistenceSync.test.ts` |
| Leaderboard workspace | Leaderboard workspace behavior. | `tests/leaderboardWorkspace.test.ts` |

## Training UI and generation UI

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| Training generation card | Generation card UI behavior. | `tests/trainingGenerationCard.test.ts` |
| Training header | Training header behavior. | `tests/trainingHeader.test.ts` |
| Training notifications | Training notification behavior. | `tests/trainingNotifications.test.ts` |
| Dictation script validation | Generated/imported script validation. | `tests/dictationScriptValidation.test.ts` |

## Configuration, languages, and build info

| Area / module | Responsibility | Relevant tests |
| --- | --- | --- |
| Config | App configuration behavior. | `tests/config.test.ts` |
| Languages | Language metadata/behavior. | `tests/languages.test.ts` |
| Build info | Build info behavior. | `tests/buildInfo.test.ts` |

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
4. If changing `LowLatencyTextarea`, run `npx vitest run tests/LowLatencyTextareaContract.test.ts tests/lowLatencyTextarea.test.ts tests/lowLatencyPerformanceGate.test.ts`.
5. If changing Supabase sync or session persistence, run `npx vitest run tests/supabaseSync.test.ts tests/useSessionPersistenceSync.test.ts`.
6. If changing mobile/PWA flow behavior, run focused unit tests first, then `npm run test:e2e:mobile`.

## Gaps and maintenance

This map is intentionally conservative.

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

| `src/app/focusedTrainingPresentation.ts` | Focused training presentation derivations for TTS player progress, source labels, placeholders, and message tone. | `tests/focusedTrainingPresentation.test.ts` |

| `src/app/focusedTrainingInputTelemetry.ts` | Focused training immediate-input telemetry initialization and live-text ref updates. | `tests/focusedTrainingInputTelemetry.test.ts` |

- `src/app/useWorkspaceNavigationEffects.ts` -> `tests/useWorkspaceNavigationEffects.test.ts`
