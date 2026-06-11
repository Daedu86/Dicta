# App shell modularization checkpoint

Date: 2026-06-10  
Branch: `product/input-2`  
Latest local commit at checkpoint time: `386749f (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Document App shell modularization checkpoint`

## Status

The App shell has been reduced substantially through a series of behavior-preserving extractions. The current `src/App.tsx` size is **3933 lines**.

The current direction is still valid: keep `App.tsx` as the orchestration shell and move stable logic, type models, reusable components, persistence helpers, and diagnostic/adaptive helpers into focused modules.

## Extracted modules

| Area | File | Lines |
| --- | --- | ---: |
| App shell | `src/App.tsx` | 3933 |
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

Start tomorrow with inspection, not extraction:

```bash
git status --short
npm run build
wc -l src/App.tsx
grep -n "^function " src/App.tsx
grep -n "^type " src/App.tsx
grep -n "^const .*=>" src/App.tsx
```

Then continue in this order:

1. **Pure helpers still near the bottom of `App.tsx`**  
   Prefer small functions that do not use React state, refs, JSX, or browser APIs directly.

2. **TTS control/action helpers**  
   Good candidates if they are pure and only consume typed inputs.

3. **Live metrics / telemetry update helpers**  
   Move only after confirming their dependencies. These are higher risk because they touch refs and session mutation.

4. **Workspace-level hooks**  
   Once pure helpers are mostly gone, consider extracting hooks around large runtime clusters. Do this in smaller commits than the helper extractions.

5. **Avoid large JSX moves for the next pass**  
   JSX extraction is riskier now. Prefer one more round of non-visual logic extraction first.

## Recent commits

```text
386749f (HEAD -> product/input-2, origin/product/input-2, origin/HEAD) Document App shell modularization checkpoint
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
