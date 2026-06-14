# Browser TTS modularization checkpoint — 2026-06-14

Status: COMPLETED / CURRENT CHECKPOINT
Branch: product/input-2
Scope: Browser TTS playback runtime and `src/App.tsx` ownership reduction
Verified against code baseline: post `Extract Browser TTS playback loop` push; `src/App.tsx` blob `09f94a6d52841c04ab13fe6790800a8dd839f11d`; `src/app/useBrowserTtsPlaybackLoop.ts` blob `b5156b5e9dfcfa80639506c7079847387b7d3476`

## Summary

This checkpoint documents the Browser TTS modularization sequence completed on 2026-06-14.

The earlier stop condition was correct when `App.tsx` still owned `playTtsFromWord`. After additional characterization and contract-test updates, ownership moved to `src/app/useBrowserTtsPlaybackLoop.ts`.

The current architecture is:

- `src/App.tsx` remains the composition root for Browser TTS state, refs, hook wiring, workspace UI, and cross-runtime callbacks.
- `src/app/useBrowserTtsPlaybackLoop.ts` owns `playTts` and `playTtsFromWord`.
- Pure Browser TTS modules still own bounded policy/decision seams.
- Contract tests now inspect the playback-loop hook, not `App.tsx`.

## Completed commits / extraction sequence

Known sequence from this Browser TTS/App-shell pass:

- `8ccfe69` Extract and test browser TTS utterance configuration
- `45a0b73` Extract browser TTS next chunk scheduler
- `d623f29` Characterize browser TTS error handling
- `5c3a1bd` Extract browser TTS unexpected error plan
- `baf2ea6` Extract active session state sync
- `84e0f0b` Extract TTS session submit action
- `Extract Browser TTS playback loop` moved `playTts` / `playTtsFromWord` ownership to `src/app/useBrowserTtsPlaybackLoop.ts`

If exact commit hashes are needed, refresh with:

```bash
git log --oneline --decorate -10
```

## Extracted modules

### `src/app/browserTtsUtteranceConfiguration.ts`

Owns deterministic `SpeechSynthesisUtterance` configuration:

- rate;
- pitch;
- volume;
- resolved lang;
- optional voice.

Focused test:

- `tests/browserTtsUtteranceConfigurationContract.test.ts`

### `src/app/browserTtsNextChunkScheduler.ts`

Owns the next-chunk scheduling decision:

- call `speakNext` immediately; or
- call it after an injected timeout delay.

Focused tests:

- `tests/browserTtsNextChunkScheduler.test.ts`
- `tests/browserTtsPlaybackLoopContract.test.ts`

### `src/app/browserTtsUnexpectedErrorPlan.ts`

Owns pure unexpected Browser TTS error planning:

- normalize browser error code;
- decide whether state should be applied after cancellation;
- provide next cancelled state;
- provide the user-visible unexpected error message.

Focused tests:

- `tests/browserTtsUnexpectedErrorPlan.test.ts`
- `tests/browserTtsPlaybackLoopContract.test.ts`
- `tests/browserTtsUtteranceConfigurationContract.test.ts`

### `src/app/useTtsSessionSubmitAction.ts`

Owns Browser TTS submit orchestration:

- validate submit prerequisites;
- run the final TTS performance sample;
- resolve final voice/environment metadata;
- build finalized session state through `ttsSessionFinalization`;
- persist/push critical session updates;
- stop playback;
- mark running/session/TTS status as finished;
- complete adaptive session feedback;
- publish submit message.

Focused tests:

- `tests/useTtsSessionSubmitAction.test.ts`
- `tests/ttsSessionFinalization.test.ts`
- `tests/useTtsPerformanceSampler.test.ts`
- `tests/useTtsPlaybackControls.test.ts`

### `src/app/useBrowserTtsPlaybackLoop.ts`

Owns Browser TTS `playTts` / `playTtsFromWord` runtime behavior:

- playback start validation;
- browser support checks;
- playback start-plan preparation;
- semantic phrase and macro-word loop state;
- voice/environment capture for playback;
- `SpeechSynthesisUtterance` creation and configuration;
- `utterance.onstart`;
- `utterance.onend`;
- `utterance.onerror`;
- perf diagnostics calls;
- TTS playback refs;
- chunk telemetry;
- adaptive benchmark writes;
- semantic phrase advancement;
- next-chunk scheduling;
- final playback completion transitions.

Focused tests:

- `tests/browserTtsPlaybackLoopContract.test.ts`
- `tests/browserTtsUtteranceConfigurationContract.test.ts`
- `tests/mockSpeechSynthesisHarness.test.ts`
- `tests/browserTtsPlaybackPlan.test.ts`
- `tests/browserTtsPlaybackStartPlan.test.ts`
- `tests/browserTtsUnexpectedErrorPlan.test.ts`
- `tests/useTtsPlaybackControls.test.ts`

## Validation

The implementing run reported:

- focused Browser TTS playback-loop validation passed after updating both source-order contract tests;
- full Vitest suite passed;
- `npm run build` passed;
- `npm run lint` passed.

For future playback-loop changes, use:

```bash
npx vitest run \
  tests/browserTtsPlaybackLoopContract.test.ts \
  tests/browserTtsUtteranceConfigurationContract.test.ts \
  tests/mockSpeechSynthesisHarness.test.ts \
  tests/useTtsPlaybackControls.test.ts \
  tests/browserTtsPlaybackPlan.test.ts \
  tests/browserTtsPlaybackStartPlan.test.ts \
  tests/browserTtsUnexpectedErrorPlan.test.ts

npm test
npm run build
npm run lint
```

## Current ownership after this pass

`src/app/useBrowserTtsPlaybackLoop.ts` now owns:

- playback start validation;
- active session/environment access for playback;
- `SpeechSynthesisUtterance` creation;
- utterance start/end/error handlers;
- perfDiagnostics calls;
- TTS playback refs used by the loop;
- adaptive benchmark writes;
- semantic phrase advancement;
- telemetry recording calls;
- UI setter invocation for playback state;
- final playback completion behavior.

`src/App.tsx` still owns:

- global app/workspace composition;
- Browser TTS state/ref declarations;
- hook wiring;
- reset side-effect sequencing;
- workspace UI prop composition;
- cross-runtime persistence/auth/adaptive/OpenRouter orchestration.

## Current stop condition

Do not continue moving Browser TTS playback runtime merely for local LOC reduction.

Future Browser TTS playback changes should be selected only when one of these is true:

1. a bug requires touching `useBrowserTtsPlaybackLoop.ts`;
2. a smaller pure helper can be extracted with explicit inputs/outputs and direct tests;
3. a mocked `SpeechSynthesis` harness makes an integration behavior safer to characterize;
4. documentation/test cleanup is needed to keep source-order contracts aligned with the current owner.

## Deferred candidates

### `resetSession` side-effect body

Decision: defer.

Reason: mostly sequencing across playback stop, refs, telemetry, UI metrics, and adaptive feedback. This remains the next plausible App-shell candidate only if hook characterization is added before movement.

### `buildSemanticPhrasesForCurrentSession`

Decision: reject for now.

Reason: too small; likely adds indirection without enough payoff.

### Further `useBrowserTtsPlaybackLoop` splitting

Decision: defer unless a small explicit seam appears.

Reason: the current hook is large but it is now the correct owner. Splitting it further without a focused seam risks churn and hidden behavior changes.
