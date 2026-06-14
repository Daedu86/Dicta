# Browser TTS modularization checkpoint — 2026-06-14

Status: PAUSED / CHECKPOINT
Branch: product/input-2
Scope: src/App.tsx::playTtsFromWord

## Summary

This checkpoint documents the Browser TTS modularization pass completed on 2026-06-14.

The goal was not to extract playTtsFromWord wholesale. The goal was to reduce small, bounded decision seams while keeping App.tsx as owner of browser event handlers, refs, timers, telemetry side effects, adaptive benchmark writes, UI setters, and final playback orchestration.

## Completed commits

- 8ccfe69 Extract and test browser TTS utterance configuration
- 45a0b73 Extract browser TTS next chunk scheduler
- d623f29 Characterize browser TTS error handling
- 5c3a1bd Extract browser TTS unexpected error plan

## Extracted modules

### src/app/browserTtsUtteranceConfiguration.ts

Owns deterministic SpeechSynthesisUtterance configuration:

- rate
- pitch
- volume
- resolved lang
- optional voice

App.tsx still owns utterance creation, refs, event handlers, diagnostics, and playback orchestration.

Focused test:

- tests/browserTtsUtteranceConfigurationContract.test.ts

### src/app/browserTtsNextChunkScheduler.ts

Owns the next-chunk scheduling decision:

- call speakNext immediately, or
- call it after an injected timeout delay.

App.tsx still owns the speakNext closure, browser timer selection, completion telemetry, refs, and orchestration.

Focused tests:

- tests/browserTtsNextChunkScheduler.test.ts
- tests/browserTtsPlaybackLoopContract.test.ts

### src/app/browserTtsUnexpectedErrorPlan.ts

Owns pure unexpected Browser TTS error planning:

- normalize browser error code;
- decide whether state should be applied after cancellation;
- provide next cancelled state;
- provide the user-visible unexpected error message.

App.tsx still owns perfDiagnostics, refs, setTtsStatus, setError, and all side effects.

Focused tests:

- tests/browserTtsUnexpectedErrorPlan.test.ts
- tests/browserTtsPlaybackLoopContract.test.ts
- tests/browserTtsUtteranceConfigurationContract.test.ts

## Validation

Final validation used:

- npx vitest run tests/browserTtsUnexpectedErrorPlan.test.ts tests/browserTtsPlaybackLoopContract.test.ts tests/browserTtsChunkCompletion.test.ts tests/browserTtsNextChunkScheduler.test.ts tests/browserTtsUtteranceConfigurationContract.test.ts
- npm run build

Observed result:

- Test Files: 5 passed
- Tests: 18 passed
- Build: OK

## Current ownership after this pass

App.tsx::playTtsFromWord still owns:

- playback start validation;
- active session/environment access;
- SpeechSynthesisUtterance creation;
- utterance.onstart;
- utterance.onend;
- utterance.onerror;
- perfDiagnostics calls;
- TTS refs;
- adaptive benchmark writes;
- semantic phrase advancement;
- telemetry persistence;
- UI setters;
- final session completion/submission behavior.

## Stop condition

Pause further Browser TTS extraction now.

Do not extract playTtsFromWord wholesale yet. The remaining loop is still coupled to browser callbacks, refs, timers, adaptive benchmark writes, phrase progression, performance sampling, and completion behavior.

Resume only after one of:

1. fresh ROI review against current HEAD;
2. mocked SpeechSynthesis runtime characterization;
3. discovery of another very small pure helper with explicit inputs/outputs;
4. documentation/test cleanup.

## Deferred candidates

### Full playTtsFromWord extraction

Decision: defer.

Reason: high ROI potential, but still high validation cost and high risk around timing, refs, cancellation, telemetry, and completion semantics.

### resetSession side-effect body

Decision: defer.

Reason: mostly sequencing across playback stop, refs, telemetry, UI metrics, and adaptive feedback.

### buildSemanticPhrasesForCurrentSession

Decision: reject for now.

Reason: too small; likely adds indirection without enough payoff.
