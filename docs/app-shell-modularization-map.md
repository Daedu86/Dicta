# App shell modularization map

Updated: 2026-06-11 after OpenRouter generation busy state extraction

## Current working-tree status

This document began as a generated map. The detailed inventories below the current status are historical unless explicitly updated.

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Latest committed baseline | 8876ed9 Extract Supabase auth actions (#61) |
| Current working-tree App shell LOC | 3198 |
| Current `src/app/useWorkspaceSessionSummaries.ts` LOC | 160 |
| Current `src/app/useWorkspaceNavigationEffects.ts` LOC | 68 |
| Current `src/app/useOpenRouterGenerationBusyState.ts` LOC | 26 |
| Current `src/app/useAdaptiveExportActions.ts` LOC | 303 |
| Current `src/app/useKeyboardRemapRuntime.ts` LOC | 80 |
| Current `src/app/useSupabaseAuthActions.ts` LOC | 192 |
| Current `src/app/useSessionCreationActions.ts` LOC | 211 |
| App.tsx inline `useState` count | 41 |
| App.tsx inline `useRef` count | 30 |
| App.tsx inline `useMemo` count | 10 |
| App.tsx inline `useEffect` count | 14 |
| App.tsx inline function declarations | 28 |

Completed since the original map:

- `useModelCatalogRuntime` owns OpenRouter/Ollama model catalog state and refresh actions.
- `useDictaLocalStorageImportRuntime` owns Dicta localStorage snapshot import restore actions.
- `useKeyboardRemapRuntime` owns active typing-language resolution and Spanish physical-key remapping.
- `useAdaptiveExportActions` owns adaptive benchmark/session-feedback copy, export, and insights diagnostic actions.
- `useSupabaseAuthActions` owns Supabase sign-in, password reset/update, auth view switching, and sign-out handlers.
- `useSessionCreationActions` owns plain-text session creation, DictationScript import validation/creation, and OpenRouter script session creation actions.
- `useWorkspaceSessionSummaries` owns derived session collections and workspace summaries.
- `useWorkspaceNavigationEffects` owns non-TTS workspace navigation side effects.
- `useOpenRouterGenerationBusyState` owns OpenRouter generation busy flags.

Current recommendation:

- Start the next pass from a fresh measurement before selecting another extraction.
- Prefer small browser/App shell hooks with explicit inputs/outputs.
- Avoid the Browser TTS playback loop, TTS refs, and regex/block-marker moves around `playTtsFromWord`.

## Baseline

| Item | Value |
| --- | ---: |
| Branch | product/input-2 |
| Commit | 8876ed9 before session-creation actions extraction |
| Git status before checkpoint | Clean tree |
| App shell file | src/App.tsx |
| App shell LOC | 3414 |
| Tracked text files | 289 |
| Tracked text LOC | 49093 |
| Tracked code files | 213 |
| Tracked code LOC | 35936 |

## Current extraction context

Recent direction: keep moving runtime/state clusters out of `src/App.tsx`, but avoid high-risk playback surgery unless the boundary is very explicit.

Important guardrail after the failed TTS refs attempt: do not remove or rewrite a block just because it contains a marker. Prefer exact exports/imports, type-level moves, small hooks with explicit return values, and build after each cut.

## App.tsx inventory

| Metric | Count |
| --- | ---: |
| Imports | 106 |
| `./app/*` imports | 43 |
| useState declarations still inline | 55 |
| useRef declarations still inline | 30 |
| useMemo declarations still inline | 23 |
| useDeferredValue declarations still inline | 1 |
| useEffect blocks detected | 18 |
| top-level function declarations detected | 70 |

### Import groups

| Group | Count |
| --- | ---: |
| ./app | 43 |
| ./local | 39 |
| ./components | 22 |
| react | 2 |

### Existing app hooks

| Hook file | LOC |
| --- | ---: |
| `src/app/useAdaptiveRuntime.ts` | 493 |
| `src/app/useAuthWorkspaceState.ts` | 82 |
| `src/app/useBrowserTtsRuntime.ts` | 81 |
| `src/app/useDictaAppProfileRuntime.ts` | 164 |
| `src/app/useDictaUiPreferences.ts` | 80 |
| `src/app/useModelPreferenceRuntime.ts` | 18 |
| `src/app/useOnlineStatus.ts` | 26 |
| `src/app/useOpenRouterJobsRuntime.ts` | 294 |
| `src/app/useSessionPersistenceSync.ts` | 848 |
| `src/app/useThemeModeRuntime.ts` | 17 |
| `src/app/useTrainingSessionLifecycle.ts` | 161 |
| `src/app/useWorkspaceRouting.ts` | 109 |

### Inline state clusters

| Cluster | useState count |
| --- | ---: |
| misc | 18 |
| openRouter | 10 |
| tts | 9 |
| session | 7 |
| adaptive | 4 |
| ollama | 3 |
| input | 2 |
| benchmark | 1 |
| training | 1 |

### Inline ref clusters

| Cluster | useRef count |
| --- | ---: |
| tts | 20 |
| misc | 5 |
| adaptive | 2 |
| session | 2 |
| openRouter | 1 |

### Function clusters

| Cluster | Function count |
| --- | ---: |
| tts | 20 |
| misc | 14 |
| openRouter | 12 |
| session | 10 |
| benchmark | 6 |
| adaptive | 3 |
| auth | 2 |
| profile | 2 |
| ollama | 1 |

## Largest App.tsx functions

These are the highest-leverage candidates, but not all are safe to extract directly. Treat this as a map, not an automatic extraction list.

| Function | Lines | Start | End | Async |
| --- | ---: | ---: | ---: | --- |
| `playTtsFromWord` | 463 | 2215 | 2677 | no |
| `generateDirectSessionFromOpenRouter` | 153 | 1587 | 1739 | yes |
| `submitTtsSession` | 51 | 2158 | 2208 | no |
| `importDictaLocalStorageSnapshot` | 51 | 2679 | 2729 | no |
| `resetSession` | 47 | 1080 | 1126 | no |
| `refreshOllamaModels` | 46 | 1172 | 1217 | yes |
| `copyInsightsDiagnosticPackage` | 44 | 2941 | 2984 | yes |
| `refreshOpenRouterModels` | 38 | 1133 | 1170 | yes |
| `updateSupabasePassword` | 38 | 1324 | 1361 | yes |
| `createSessionFromDictationScript` | 33 | 1410 | 1442 | no |
| `createOpenRouterErrorSession` | 32 | 1478 | 1509 | no |
| `publishTtsUiState` | 26 | 2018 | 2043 | no |
| `buildAdaptiveEventCounts` | 25 | 2825 | 2849 | no |
| `requestSupabasePasswordReset` | 24 | 1299 | 1322 | yes |
| `createSessionWithMode` | 24 | 1381 | 1404 | no |
| `copyBenchmarkFeedbackPromptWithHumanFeedback` | 23 | 3007 | 3029 | yes |
| `handleEsKeyboardRemapKeyDown` | 21 | 1862 | 1882 | no |
| `stopTtsPlayback` | 21 | 2761 | 2781 | no |
| `seekTtsPlayback` | 21 | 2783 | 2803 | no |
| `openOpenRouterGenerateForActiveInput` | 20 | 1566 | 1585 | no |
| `estimateTtsSpokenWordIndex` | 19 | 1981 | 1999 | no |
| `signOut` | 17 | 1363 | 1379 | yes |
| `collectBrowserTtsEnvironmentForSession` | 16 | 1890 | 1905 | no |
| `resolveActiveBrowserTtsVoice` | 16 | 1918 | 1933 | no |
| `signInWithSupabase` | 15 | 1273 | 1287 | yes |

## useEffect map

| Start line | End line | Dependency / close line | Preview |
| ---: | ---: | --- | --- |
| 249 | 281 | `}, [browserTtsVoices]);` | useEffect(() => { if (browserTtsVoices.length === 0) return; setSessions((prev) => { let changed = false; const usedVoiceURIs = prev |
| 289 | 291 | `}, [ttsPracticeText]);` | useEffect(() => { ttsPracticeLiveTextRef.current = ttsPracticeText; }, [ttsPracticeText]); const [directOpenRouterBusy, setDirectOpenRouterBusy] = useState(false); |
| 639 | 651 | `}, []);` | useEffect(() => { perfDiagnostics.recordRender('App', appRenderCountRef.current); }); useEffect(() => { |
| 643 | 651 | `}, []);` | useEffect(() => { const enabled = perfDiagnostics.configure({ envDev: import.meta.env.DEV, search: window.location.search, storage: window.localStorage, |
| 653 | 733 | `};` | useEffect(() => { if (!perfDiagnosticsEnabled && !import.meta.env.DEV) { delete window.__DICTA_DEBUG_EXPORT__; return; } |
| 741 | 745 | `}, [openRouterAccessState, showLeaderboardWorkspace, workspaceMode]);` | useEffect(() => { if (workspaceMode !== 'openrouter' \|\| openRouterAccessState !== 'denied') return; showLeaderboardWorkspace(); setOpenRouterError(openRouterAccessMessage); }, [ope |
| 748 | 751 | `}, [adaptiveBenchmarksByInputLanguage, localStorageReadyForEffectiveProfile]);` | useEffect(() => { if (!localStorageReadyForEffectiveProfile) return; persistAdaptiveBenchmarks(adaptiveBenchmarksByInputLanguage); }, [adaptiveBenchmarksByInputLanguage, localStora |
| 753 | 755 | `}, [adaptiveBenchmarksByInputLanguage]);` | useEffect(() => { adaptiveBenchmarksRef.current = adaptiveBenchmarksByInputLanguage; }, [adaptiveBenchmarksByInputLanguage]); useEffect(() => { |
| 757 | 761 | `}, [adaptiveSessionFeedbackByInputLanguage, localStorageReadyForEffectiveProfile]);` | useEffect(() => { adaptiveSessionFeedbackRef.current = adaptiveSessionFeedbackByInputLanguage; if (!localStorageReadyForEffectiveProfile) return; persistAdaptiveSessionFeedback(ada |
| 763 | 765 | `}, [ensureLatestBrowserTtsDeDictationScriptFeedback, sessions]);` | useEffect(() => { ensureLatestBrowserTtsDeDictationScriptFeedback(sessions); }, [ensureLatestBrowserTtsDeDictationScriptFeedback, sessions]); useEffect(() => { |
| 767 | 778 | `}, [sessions, activeSessionId]);` | useEffect(() => { if (sessions.length === 0) { if (activeSessionId) { setActiveSessionId(''); } |
| 780 | 793 | `}, [activeInputWorkspaceMode, activeSession, showWorkspaceMode, workspaceMode]);` | useEffect(() => { if (suppressSidebarAutoSelectRef.current) return; if ( activeSession && workspaceMode !== 'leaderboard' && |
| 795 | 827 | `}, [workspaceMode]);` | useEffect(() => { if (workspaceMode !== 'admin') return; if (!LOCAL_DEV_FEATURES_AVAILABLE) { setAdminFileInventory(null); setAdminFileInventoryError('Local file inventory is avail |
| 886 | 959 | `}, [activeSessionId]);` | useEffect(() => { if (activeInputMode !== BROWSER_TTS_SESSION_INPUT_MODE \|\| activeSessionFinished \|\| !ttsHasText) { return; } |
| 908 | 959 | `}, [activeSessionId]);` | useEffect(() => { if (!activeSession) return; hydratingSessionIdRef.current = activeSession.id; setDifficulty(activeSession.difficulty); |
| 961 | 979 | `}, [activeSession, sessionStatus, sessions]);` | useEffect(() => { if (!activeSession \|\| activeSession.status !== 'finished' \|\| sessionStatus === 'finished') return; setRunning(false); setSessionStatus('finished'); |
| 981 | 1061 | `ttsLanguage,` | useEffect(() => { if (!activeSession) return; if (hydratingSessionIdRef.current === activeSession.id) { hydratingSessionIdRef.current = null; return; |
| 1074 | 1078 | `}, [ttsStatus]);` | useEffect(() => { if (ttsStatus !== 'playing') return; const interval = window.setInterval(() => setTtsPlayerProgressTick((value) => value + 1), 500); return () => window.clearInte |

## Top repo files by LOC

| Rank | File | LOC |
| ---: | --- | ---: |
| 1 | `package-lock.json` | 4385 |
| 2 | `src/App.tsx` | 3753 |
| 3 | `src/components/openrouter/OpenRouterWorkspace.tsx` | 1208 |
| 4 | `src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace.tsx` | 1206 |
| 5 | `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts` | 1172 |
| 6 | `src/styles/adaptive-workspace.css` | 955 |
| 7 | `vite.config.ts` | 910 |
| 8 | `src/app/useSessionPersistenceSync.ts` | 848 |
| 9 | `tests/supabaseSync.test.ts` | 746 |
| 10 | `src/core/supabaseSync.ts` | 695 |
| 11 | `src/core/adaptive/sessionFeedback.ts` | 672 |
| 12 | `src/core/adaptive/ListeningTrainerPolicy.ts` | 589 |
| 13 | `src/components/session-dashboard/SessionDashboard.tsx` | 547 |
| 14 | `src/components/adaptive-workspace/AdaptiveAdvancedDiagnostics.tsx` | 508 |
| 15 | `src/core/perfDiagnostics.ts` | 507 |
| 16 | `tests/useSessionPersistenceSync.test.ts` | 497 |
| 17 | `src/app/useAdaptiveRuntime.ts` | 493 |
| 18 | `src/core/adaptive/adaptiveUserSystemReport.ts` | 445 |
| 19 | `api/openrouter/jobs.js` | 406 |
| 20 | `tests/adaptiveController.test.ts` | 391 |
| 21 | `src/core/adaptive/types.ts` | 383 |
| 22 | `src/styles/bottom-metrics.css` | 381 |
| 23 | `src/core/adaptive/AdaptiveDictationController.ts` | 374 |
| 24 | `tests/adaptiveSemantic.test.ts` | 364 |
| 25 | `src/components/ollama/OllamaWorkspace.tsx` | 346 |
| 26 | `src/components/AdaptiveBenchmarkCharts.tsx` | 339 |
| 27 | `src/components/leaderboard/LeaderboardWorkspace.tsx` | 335 |
| 28 | `src/styles/workspace-responsive.css` | 334 |
| 29 | `src/components/openrouter/openRouterViewHelpers.ts` | 327 |
| 30 | `src/components/TrainingView.tsx` | 326 |
| 31 | `src/core/adaptive/openRouterGenerationPrompt.ts` | 317 |
| 32 | `src/core/adaptive/dictationScriptValidation.ts` | 316 |
| 33 | `docs/adaptive-workspace-modularization.md` | 309 |
| 34 | `src/styles/sidebar-brand.css` | 305 |
| 35 | `docs/openrouter-workspace-modularization.md` | 304 |
| 36 | `src/components/admin/AdminWorkspace.tsx` | 303 |
| 37 | `src/app/useOpenRouterJobsRuntime.ts` | 294 |
| 38 | `src/styles/leaderboard.css` | 289 |
| 39 | `docs/auth-workspace-modularization.md` | 285 |
| 40 | `src/styles/tts-workspace.css` | 272 |

## Directory LOC map

| Directory | Files | LOC |
| --- | ---: | ---: |
| `src/components` | 48 | 8961 |
| `src/core` | 41 | 8248 |
| `src/styles` | 35 | 4882 |
| `package-lock.json` | 1 | 4385 |
| `src/app` | 46 | 4347 |
| `src/App.tsx` | 1 | 3753 |
| `src/inputs` | 9 | 1132 |
| `api/openrouter` | 5 | 1004 |
| `vite.config.ts` | 1 | 910 |
| `tests/supabaseSync.test.ts` | 1 | 746 |
| `supabase/migrations` | 4 | 508 |
| `tests/useSessionPersistenceSync.test.ts` | 1 | 497 |
| `tests/adaptiveController.test.ts` | 1 | 391 |
| `tests/adaptiveSemantic.test.ts` | 1 | 364 |
| `api/ollama` | 4 | 321 |
| `docs/adaptive-workspace-modularization.md` | 1 | 309 |
| `docs/openrouter-workspace-modularization.md` | 1 | 304 |
| `docs/auth-workspace-modularization.md` | 1 | 285 |
| `docs/architecture.md` | 1 | 266 |
| `tests/openRouterJobRoute.test.ts` | 1 | 265 |
| `README.md` | 1 | 236 |
| `api/admin` | 1 | 231 |
| `tests/adaptiveUserSystemReport.test.ts` | 1 | 229 |
| `AGENTS.md` | 1 | 215 |
| `tests/lowLatencyTextarea.test.ts` | 1 | 214 |
| `tests/listeningTrainerPolicy.test.ts` | 1 | 208 |
| `tests/browserTtsRatePolicy.test.ts` | 1 | 199 |
| `tests/browserTtsRecoveryPolicy.test.ts` | 1 | 195 |
| `docs/app-shell-header-modularization.md` | 1 | 193 |
| `tests/dictationScriptValidation.test.ts` | 1 | 181 |
| `tests/adaptiveBenchmarkService.test.ts` | 1 | 180 |
| `tests/ttsDynamicChunkPlanner.test.ts` | 1 | 180 |
| `api/auth` | 2 | 179 |
| `tests/appProfiles.test.ts` | 1 | 179 |
| `api/_supabaseProfile.js` | 1 | 165 |
| `tests/ollamaChatRoute.test.ts` | 1 | 159 |
| `docs/next-modularization-plan.md` | 1 | 158 |
| `tests/useBrowserTtsRuntime.test.ts` | 1 | 143 |
| `tests/useOpenRouterJobsRuntime.test.ts` | 1 | 139 |
| `docs/session-dashboard-modularization.md` | 1 | 136 |

## Historical balanced modularization recommendations

These were the recommendations from the original generated map. Several are now complete; keep this section as historical context, not the active queue.

### Completed from this list

- OpenRouter/Ollama model catalog runtime.
- Snapshot import/export runtime, scoped to Dicta localStorage import.
- Keyboard/input remap runtime.
- Adaptive export/workspace actions, scoped to benchmark/session-feedback copy/export and insights diagnostics.

### Recommended next run: medium, explicit, build-safe

Do not attack TTS playback internals yet. The failed attempt showed that markers inside large functions are too dangerous without an AST-level move.

Better next targets should be selected from a new measurement. Good candidates remain small hook-level runtime clusters with explicit return values and no playback-loop surgery.

### Avoid for now

- TTS refs + playback loop extraction.
- Any regex deletion around `playTtsFromWord`, `importDictaLocalStorageSnapshot`, or generation handlers.
- Any script that removes a block by searching only for one marker inside it.

## Suggested checkpoint commit

Commit this file after `npm run build` passes:

```bash
git add docs/app-shell-modularization-map.md
git commit -m "Document App shell modularization map"
git push origin product/input-2
```
