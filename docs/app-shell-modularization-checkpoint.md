# App shell modularization checkpoint

Date: 2026-06-10  
Branch: `product/input-2`  
Latest local commit at checkpoint time: `258db0a (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract App runtime helpers`

## Status

The App shell reduction pass is complete for the current stage. `src/App.tsx` is now **3879 lines**.

The key structural milestone is that `App.tsx` should now expose only the main top-level component function:

```text
178:function App() {
```

The current architecture keeps `App.tsx` as the orchestration shell while stable logic, reusable components, persistence helpers, diagnostic helpers, TTS helpers, and adaptive metrics helpers live in focused modules.

## Follow-up — 2026-06-11

The next App shell pass continued with hook-level runtime clusters and kept the same browser/App shell boundary. After extracting keyboard remapping, adaptive export/copy actions, Supabase auth action handlers, session creation/import actions, workspace/session state hooks, direct OpenRouter generation actions, OpenRouter error-session actions, focused-training generation button composition, workspace prop composition, App shell header props, auth workspace props, session create card props, Admin workspace props, Leaderboard workspace props, and Adaptive advanced diagnostics props, `src/App.tsx` is **2682 lines** in the working tree.

New modules added after this checkpoint:

- `src/app/useModelCatalogRuntime.ts`
- `src/app/useDictaLocalStorageImportRuntime.ts`
- `src/app/useKeyboardRemapRuntime.ts`
- `src/app/useAdaptiveExportActions.ts`
- `src/app/useSupabaseAuthActions.ts`
- `src/app/useSessionCreationActions.ts`
- `src/app/useWorkspaceSessionSummaries.ts`
- `src/app/useWorkspaceNavigationEffects.ts`
- `src/app/useOpenRouterGenerationBusyState.ts`
- `src/app/useOpenRouterGenerationActions.ts`
- `src/app/useAdaptiveDiagnosticsUiState.ts`
- `src/app/useAppPerfDiagnosticsRuntime.ts`
- `src/app/useAdaptiveStoragePersistenceEffects.ts`
- `src/app/useDictaDebugExportEffect.ts`
- `src/app/useAdaptiveWorkspaceState.ts`
- `src/app/useDictaSupabaseRuntime.ts`
- `src/app/useSessionCreationWorkspaceState.ts`
- `src/app/useFocusedTrainingGenerationButtons.ts`
- `src/app/useSessionCreateCardProps.ts`
- `src/app/useAuthWorkspaceProps.ts`
- `src/app/useAppShellHeaderProps.ts`
- `src/app/useOllamaWorkspaceProps.ts`
- `src/app/useOpenRouterWorkspaceProps.ts`
- `src/app/useOpenRouterErrorSessionActions.ts`
- `src/app/useAdminWorkspaceProps.ts`
- `src/app/useLeaderboardWorkspaceProps.ts`
- `src/app/useAdaptiveAdvancedDiagnosticsProps.ts`

The remaining high-risk area is still the Browser TTS playback loop. Do not extract `playTtsFromWord` or the TTS refs as a casual line move; start from a fresh boundary map and build after each cut.

## Extracted modules

| Area | File | Lines |
| --- | --- | ---: |
| App shell | `src/App.tsx` | 3879 |
| Admin shell | `src/components/admin/AdminWorkspace.tsx` | 303 |
| Session/local UI types | `src/app/sessionTypes.ts` | 127 |
| TTS pacing helpers | `src/app/ttsPacingHelpers.ts` | 36 |
| Session storage/restore helpers | `src/app/sessionStorage.ts` | 139 |
| Adaptive feedback context | `src/app/adaptiveFeedbackContext.ts` | 186 |
| Shared Metric component | `src/components/shared/Metric.tsx` | 9 |
| Shared SessionDeviceIcon component | `src/components/shared/SessionDeviceIcon.tsx` | 20 |
| TTS playback profile helpers | `src/app/ttsPlaybackProfile.ts` | 83 |
| Dictation script semantic phrase helpers | `src/app/dictationScriptSemanticPhrases.ts` | 35 |
| Repeat word stats helpers | `src/app/repeatWordStats.ts` | 98 |
| App runtime helpers | `src/app/appRuntimeHelpers.ts` | 71 |

## Completed in this pass

- Extracted `AdminWorkspace` out of `App.tsx`.
- Removed dead inline helpers and dead locked-input summary wiring.
- Extracted App-local session/debug/type models to `src/app/sessionTypes.ts`.
- Extracted TTS pacing helpers to `src/app/ttsPacingHelpers.ts`.
- Extracted session restore/storage helpers to `src/app/sessionStorage.ts`.
- Extracted adaptive feedback/activity context helpers to `src/app/adaptiveFeedbackContext.ts`.
- Extracted shared inline UI components:
  - `Metric`
  - `SessionDeviceIcon`
- Extracted TTS playback profile logic to `src/app/ttsPlaybackProfile.ts`.
- Extracted dictation script semantic phrase helpers to `src/app/dictationScriptSemanticPhrases.ts`.
- Extracted repeat-word/transcript stats helpers to `src/app/repeatWordStats.ts`.
- Extracted remaining App runtime helpers to `src/app/appRuntimeHelpers.ts`.

## Verification pattern used

Each extraction followed this cycle:

```bash
npm run build
wc -l src/App.tsx <new-file>
git diff --stat
git status --short
git commit -m "<checkpoint message>"
git push origin product/input-2
```

## Recommended next steps

Start the next pass with inspection, not extraction:

```bash
git status --short
npm run build
wc -l src/App.tsx
grep -n "^function " src/App.tsx
grep -n "^type " src/App.tsx
grep -n "^const .*=>" src/App.tsx
```

Then continue in this order:

1. **Inspect remaining inline closures inside `function App()`**  
   The top-level helper cleanup is mostly complete. The next reductions will likely require extracting hooks or workspace controller modules from inside `App()`.

2. **Prefer hook-level extraction over more file-splitting**  
   Good candidates are runtime clusters with clear state/ref boundaries, such as TTS control, live metrics, session mutation, or adaptive diagnostics.

3. **Avoid large JSX extraction until the next stable checkpoint**  
   JSX extraction is riskier than pure helper extraction. Keep visual moves small and isolated.

4. **Keep every pass build-verified**  
   Continue with small commits and `npm run build` after each extraction.

## Recent commits

```text
258db0a (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Extract App runtime helpers
2bb0f2f Document App shell modularization checkpoint
386749f Document App shell modularization checkpoint
43633ac Extract repeat word stats helpers
6a1ff4c Extract dictation script semantic phrases
1134055 Extract TTS playback profile helpers
f897c39 Extract shared inline components
1c8b85c Extract adaptive feedback context helpers
133201e Extract session storage helpers
11b16f9 Extract TTS pacing helpers
c98c52f Extract App session types
571b4c0 Remove dead locked input summary
a0f9f3c Remove dead App helpers
1827c3f Extract AdminWorkspace shell
```

## 2026-06-11 � Auth headers and model refresh extraction

- Extracted reusable auth-header creation into `src/app/useAuthHeaders.ts`.
- Extracted `refreshOpenRouterModels` and `refreshOllamaModels` into `src/app/useModelRefreshActions.ts`.
- Kept Browser TTS playback/runtime, `resetSession`, telemetry refs, and OpenRouter generation paths untouched.
- Current `src/App.tsx` line count after this cut: 3301.
- New hook line counts: `useAuthHeaders.ts` = 22; `useModelRefreshActions.ts` = 69.
- Verified with `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

## Follow-up — 2026-06-11 focused-training generation buttons

Latest committed baseline: `079e249 Extract focused training generation buttons`.

Current App shell metrics after this checkpoint:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2711 |
| `src/app/useOpenRouterErrorSessionActions.ts` LOC | 117 |
| `src/app/useFocusedTrainingGenerationButtons.ts` LOC | 208 |
| App.tsx inline `useState` count | 9 |
| App.tsx inline `useRef` count | 13 |
| App.tsx inline `useMemo` count | 8 |
| App.tsx inline `useEffect` count | 8 |
| App.tsx inline function declarations | 25 |

This checkpoint extracted persistent OpenRouter error-session handling and focused-training generation button composition without touching Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, or `playTtsFromWord`.

## Follow-up — 2026-06-11 App shell props checkpoint

Latest committed baseline: `3a201a2 Extract Leaderboard workspace props`.

This checkpoint covers these App shell extractions since the previous docs checkpoint: OpenRouter workspace props, Ollama workspace props, App shell header props, Auth workspace props, Session create card props, Admin workspace props, Leaderboard workspace props, and Adaptive advanced diagnostics props.

Current App shell metrics:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2682 |
| `src/app/useOpenRouterErrorSessionActions.ts` LOC | 117 |
| `src/app/useFocusedTrainingGenerationButtons.ts` LOC | 208 |
| `src/app/useOpenRouterWorkspaceProps.ts` LOC | 164 |
| `src/app/useOllamaWorkspaceProps.ts` LOC | 52 |
| `src/app/useAppShellHeaderProps.ts` LOC | 86 |
| `src/app/useAuthWorkspaceProps.ts` LOC | 90 |
| `src/app/useSessionCreateCardProps.ts` LOC | 57 |
| `src/app/useAdminWorkspaceProps.ts` LOC | 89 |
| `src/app/useLeaderboardWorkspaceProps.ts` LOC | 114 |
| `src/app/useAdaptiveAdvancedDiagnosticsProps.ts` LOC | 84 |
| App.tsx inline `useState` count | 25 |
| App.tsx inline `useRef` count | 27 |
| App.tsx inline `useMemo` count | 8 |
| App.tsx inline `useEffect` count | 8 |
| App.tsx inline function declarations | 25 |

Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, and `playTtsFromWord` remained untouched in this sequence. The next small candidate is `AdaptiveBenchmarkSection` prop composition, while adaptive policy/export action behavior should stay in its existing owners.
## Follow-up — 2026-06-11 Adaptive benchmark and live metrics props

Latest committed baseline: `ad42cef Extract live metrics dock props`.

This checkpoint covers the two most recent App shell prop-composition extractions:

- `src/app/useAdaptiveBenchmarkSectionProps.ts` owns Adaptive benchmark section prop composition, benchmark selection message reset, and benchmark/session-feedback copy/export callback wiring.
- `src/app/useLiveMetricsDockProps.ts` owns live metrics dock prop composition, metrics view setters, insights diagnostics callback wiring, collapsed-state toggling, and TTS-current-chunk presence mapping.

Current App shell metrics after this checkpoint:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2683 |
| `src/app/useAdaptiveBenchmarkSectionProps.ts` LOC | 170 |
| `src/app/useLiveMetricsDockProps.ts` LOC | 111 |

Verified both cuts with `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched in this sequence.

Next pass should start from a clean `ad42cef` baseline and inspect remaining low-risk prop-composition or non-TTS UI-state boundaries before touching runtime logic.
## Follow-up — 2026-06-11 Focused training view props

Latest committed baseline: `522a983 Extract focused training view props`.

This checkpoint adds `src/app/useFocusedTrainingViewProps.ts`, which owns focused `TrainingView` prop composition, visible score/accuracy/lag labels, focused training controls wiring, replay availability mapping, pending-session callbacks, sync summary props, and generation button props.

Current App shell metrics after this checkpoint:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2670 |
| `src/app/useFocusedTrainingViewProps.ts` LOC | 177 |

Verified with `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

Browser TTS playback/runtime, phrase progression, TTS refs/timers/telemetry, `resetSession`, and `playTtsFromWord` remained untouched. The hook receives `onReplayFocusedTts` as a callback and does not own replay logic.

Next pass should start from a clean `522a983` baseline and inspect remaining low-risk prop-composition or non-TTS UI-state boundaries before touching runtime logic.
## Follow-up — 2026-06-11 Modularization ROI reassessment

Latest committed baseline: `f0c2d4f Extract app shell sync status text`.

This checkpoint recalibrates the App shell modularization strategy. The earlier phase successfully removed large prop-composition, workspace, action, persistence, auth, OpenRouter, adaptive, leaderboard, admin, and focused-training clusters from `src/App.tsx`.

The remaining work should no longer be evaluated as "can this become a hook?" but as "does this extraction reduce App-shell complexity enough to justify another module?"

Current App shell metrics at this reassessment:

| Item | Value |
| --- | ---: |
| `src/App.tsx` LOC | 2675 |
| `src/app/useAppShellSyncStatusText.ts` LOC | 43 |

### Updated decision model

Future extractions should be ranked by ROI:

1. High ROI — derived-state or runtime/state clusters that remove meaningful App complexity, improve ownership, and create a testable seam.
2. Medium ROI — isolated effects or UI-state boundaries that reduce coupling but require careful dependency plumbing.
3. Low ROI — short labels, one-line callbacks, tiny prop wrappers, or cosmetic JSX moves.
4. Rejected for now — Browser TTS playback loop, `playTtsFromWord`, `resetSession`, phrase progression, TTS refs/timers/telemetry, or block-marker/regex-driven moves.

### Current assessment

The broad props-composition phase is mostly complete. More props hooks should be created only when they collapse a large, coherent boundary. The next useful work should target derived-state or non-playback runtime clusters.

Recommended next extraction: `useFocusedTrainingLiveMetrics`.

This candidate should own focused-training metric derivation: transcript evaluation, visible accuracy/score, points/max-points, score help text, points help text, and static accuracy help text. It is safer than session hydration/persistence because it is pure derived state and does not mutate sessions, timers, refs, playback state, or telemetry.

The expected benefit is not just line reduction. The main benefit is making listening metric derivation explicit and testable while reducing the number of derived values that `App.tsx` has to coordinate before building `focusedTrainingProps`.

Validation requirement remains unchanged: `npm run lint`, `npm run test -- --reporter=verbose`, `npm run build`, and `npm run test:e2e:mobile`.

After the next extraction, update this checkpoint with actual `App.tsx` LOC, new hook LOC, validation results, and whether the extraction produced net App-shell reduction.

