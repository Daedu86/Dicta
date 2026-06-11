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

The next App shell pass continued with hook-level runtime clusters and kept the same browser/App shell boundary. After extracting keyboard remapping, adaptive export/copy actions, Supabase auth action handlers, session creation/import actions, workspace/session state hooks, and direct OpenRouter generation actions, `src/App.tsx` is **2859 lines** in the working tree.

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
