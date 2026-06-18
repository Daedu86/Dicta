# Listening Cycle V3 Architecture

_Last updated: 2026-06-18_

This document describes the implemented Listening Cycle V3 baseline. It is intentionally short and operational: it documents what the runtime now owns, what the LLM may own, and which files form the current V3 spine.

## Product rule

Dicta is listening-first. The goal is not to force faster typing. The goal is to help the learner hear, segment, retain, reconstruct, and then type what was heard.

```text
LLM generates training material.
Planner/chunker makes it listenable.
Runtime controls Browser TTS timing.
Telemetry explains listener state.
Reports close the loop for the next session.
```

Runtime timing, replay slicing, voice-rate safety, and causal diagnostics must stay deterministic. Do not move live pacing decisions into the LLM.

## V3 spine

```text
source phrase
  -> Browser TTS adaptive chunk planner
  -> v3Prosody metadata
  -> Browser TTS pause model
  -> Browser TTS voice calibration
  -> utterance runtime
  -> live telemetry
  -> normalized telemetry
  -> universal sample quality gate
  -> continuous pressure vector
  -> adaptiveLevel + pacing output
  -> listenerStateV3
  -> surgicalReplayPlan
  -> insight report V3
  -> next-session knobs
```

## Implemented layers

### 1. Prosody metadata per chunk

Files:

- `src/inputs/browserTts/ttsDynamicChunkPlanner.ts`
- `src/inputs/browserTts/ttsDynamicChunkPlannerTypes.ts`
- `src/inputs/browserTts/ttsChunkProsodyMetadata.ts`

Each planned chunk can expose `v3Prosody` with the information needed for downstream timing and diagnostics:

- boundary strength
- pause class
- semantic completeness
- syntactic risk
- edge-word flag
- replay strategy
- breath group
- reason codes

### 2. Runtime pause model

Files:

- `src/app/browserTtsPlaybackLoopPauseModel.ts`
- `src/app/browserTtsPlaybackPlan.ts`
- `src/app/browserTtsPlaybackLoopCompletionHandler.ts`

The runtime now maps `v3Prosody.pauseClass` to separate pause buckets:

- `micro`: 500 ms
- `boundary`: 900 ms
- `sentence`: 1400 ms
- `recovery`: 2600 ms

All nonzero chunk pauses are clamped to 500-4000 ms. Pause resolution happens in the playback plan and is carried through chunk commit, completion scheduling, benchmark telemetry, and decision traces as the same resolved value. Legacy fallback remains available when no V3 prosody exists, but controller fallback pauses only schedule when the controller explicitly requested a pause.

Minor boundaries are playable microchunk pauses. Unsafe boundaries stay unpaused at the immediate edge so the next planning pass can move toward a safe clause or sentence boundary.

### 3. Browser TTS voice calibration

Files:

- `src/app/browserTtsVoiceCalibration.ts`
- `src/app/browserTtsPlaybackLoopUtterance.ts`
- `src/app/browserTtsUtterancePerfMetadata.ts`

The runtime no longer assumes that `rate = 1.0` means the same thing across browsers, OSes, and voices. Recommendation and prescription code can represent the broad product envelope of 0.1-2.0, while Browser TTS execution still applies voice/runtime safety caps. The playback loop calculates an `effectiveRate`, applies safety caps, and records calibration metadata.

The continuous adaptive brain is shared across Browser TTS languages. Language tuning is represented by `LanguageAdaptiveCalibration`, while `support/recovery/balanced/flow` survive only as derived legacy/debug labels. Perceptual pause pressure can raise `pauseMsTarget` without lowering playback rate when rate is not the problem.

### 4. Listener state V3

Files:

- `src/core/adaptive/listenerStateV3.ts`
- `src/app/browserTtsTelemetry.ts`
- `src/core/adaptive/types.ts`

Listener diagnosis is split into separate axes:

- listening / segmentation
- reconstruction
- typing mechanics
- TTS environment

Low WPM is not automatically listening failure.

### 5. Surgical replay plan

Files:

- `src/app/browserTtsSurgicalReplayPlan.ts`
- `src/app/browserTtsPlaybackPlan.ts`
- `src/app/browserTtsPlaybackPlanTypes.ts`

Replay is precomputed as a slice plan:

- `repeat-short`
- `repeat-from-nucleus`
- `repeat-with-preroll`

The runtime does not rely on browser word-boundary events to replay arbitrary mid-utterance spans.

### 6. Insight report V3

Files:

- `src/core/adaptive/listeningCycleInsightReportV3.ts`
- `src/core/adaptive/adaptiveUserSystemReportListeningCycleV3.ts`
- `src/core/adaptive/types.ts`

The report summarizes observed evidence rather than inventing causal explanations. It uses telemetry frames, listener state, prosody, replay plans, pause data, and voice calibration metadata to produce:

- primary constraint
- confidence
- evidence counts
- reason codes
- summary bullets
- next-session knobs
- continuous adaptive summary
- sample quality by use
- pressure vector and pacing output
- requested-vs-actual rate/pause

The adaptive user/system report schema is now v3 and includes a top-level `listeningCycleV3` block. It records the primary constraint, axes, confidence, evidence counts, reason codes, next-session knobs, contradiction notes, continuous adaptive fields, sample quality, language calibration, requested-vs-actual execution, and an accessibility note that real pauses and semantic chunks are intentional listening supports.

## Allowed LLM responsibilities

The LLM may:

- generate lesson material
- generate examples and prompts
- summarize deterministic report outputs in user-facing language
- explain a deterministic diagnosis after the runtime/report builder has produced evidence

The LLM must not:

- decide live pause timing
- decide Browser TTS replay ranges at playback time
- override voice-rate safety caps
- infer that low WPM equals listening failure without evidence
- replace telemetry-driven next-session knobs with guesses

## Validation commands

Run the focused V3 suite before changing this spine:

```bash
npm test -- ttsDynamicChunkPlanner
npm test -- browserTtsPlaybackLoopPauseModel
npm test -- browserTtsVoiceCalibration
npm test -- listenerStateV3
npm test -- browserTtsSurgicalReplayPlan
npm test -- listeningCycleInsightReportV3
npm test -- adaptiveUserSystemReport
npm test -- browserTtsDeBenchmarkTolerance
npm run build
```

## Future work

Recommended next changes should be additive:

1. Continue improving how the top-level V3 report block is presented in visible session reports.
2. Add user-triggered replay controls that consume `surgicalReplayPlan`.
3. Persist voice calibration observations per voice/browser/platform.
4. Promote V3 next-session knobs into adaptive session planning.
5. Only move or delete legacy docs after active V3 docs cover the same operational use case.
