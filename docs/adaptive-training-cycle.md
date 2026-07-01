# Adaptive Training Cycle

_Last updated: 2026-06-29_

Dicta is a closed adaptive listening loop. This page is the compact entry point for the adaptive training cycle.

Related docs:

- [Adaptive training cycle component guide](./adaptive-training-cycle-cycle.md)
- [Dicta Architecture](./architecture.md)
- [Adaptive Listening Brain](./adaptive-listening-brain.md)
- [Listening-First Architecture](./listening-first-architecture.md)

## One-line model

The runtime loop is causal: memory feeds preparation, preparation drives the current session, the session produces evidence, and that evidence updates the next turn. Benchmark and feedback feed the training prescription. The prescription guides LLM generation. The planner turns generated text into playable chunks. The controller chooses live pacing. The runtime pipeline makes the decision executable. Browser TTS speaks internal slices while Training Mode exposes one safe learner-facing chunk at a time and can replay that active chunk from its exact source-word boundary. Safe pauses are learner-paced so the next chunk starts after the configured minimum mental rest only when the learner submits/skips. Correct typing and timeout alone do not advance chunk practice. The final chunk is manual via `Finish session`. Telemetry updates benchmark and feedback. The insight report explains the full loop.

During active chunk practice, the separate Media player card is hidden. Its existing `Play` command is rendered inside the active chunk action row and returns focus to the learner textarea; `Replay chunk` remains scoped to the active chunk's exact source-word boundary.

## Workspace map

The Adaptive Pace Layer Flow workspace explains the loop as four auditable groups. Phase 1 / Generation also contains the live direct OpenRouter Generate Training Session card. Step 5 / Playback loop contains the local safe-pause gate controls for Browser TTS minimum mental rest and max fallback. The generation card now uses the same `direct-training` path as Training Mode, owns the locally persisted 2-10 minute duration preference, shows the final compact prompt sent to OpenRouter, and offers no-context and "my context" prompt variants. Training Mode does not expose a duration selector; its direct generation labels, help text, and OpenRouter job duration reflect the Phase 1 selector.

- Memory: 20-day benchmark, recent feedback, and active `browser-tts/{language}` calibration.
- Prepare: Generation, Planner, and Chunker convert evidence into content, runtime policy, playable TTS slices, and safe learner-facing practice chunks.
- Run: Browser TTS and the Playback loop execute the current session, collect live pressure, and wait for learner chunk submission at safe boundaries.
- Learn: Scoring, optional practice-chunk telemetry, Benchmark, and Adaptation return evidence to the next cycle.

Training Mode direct generation keeps each OpenRouter request as a separate visible job row with its own elapsed-time counter. Active rows can be canceled, which marks the durable job as canceled and stops browser polling for that request without treating it as a learner-facing generated error session. Provider waits leave a persistence buffer before the 300-second Vercel job window, and stale durable jobs are marked failed on poll instead of remaining active indefinitely. Direct prompts request `compact-chunks-v1` by default: OpenRouter returns only a title and semantic chunks, while Dicta locally builds the full `DictationScript` from the trainer prescription and semantic phrase planner. Legacy full `DictationScript` JSON is still accepted for old jobs and fallback responses.

## Module map

| Module | Owns |
| --- | --- |
| Benchmark + Feedback | Long-term memory, latest diagnosis, confidence, recency, and next-session pressure. |
| ListeningTrainerPolicy | Safe pedagogical recipe. |
| LLM generation | Compatible training material, not runtime pacing. |
| Pre-TTS planner | Safe playable chunks. |
| AdaptiveDictationController | Live pacing intent and reason codes. |
| Runtime decision pipeline | Browser-executable pacing. |
| Browser TTS | Audio execution and environment behavior. |
| Telemetry | What actually happened. |
| Adaptive Insight Report | Requested to learned explanation. |

## Iteration rules

1. Scope saved adaptive memory by input mode and language.
2. Keep the Browser TTS adaptive motor shared: language differences belong in calibration, not separate DE/ES runtime pipelines.
3. Treat WPM and perceptual pause as dictation signals, not decorative metrics.
4. Keep runtime pacing out of the LLM.
5. Keep content generation out of the controller.
6. Surface runtime modifications to controller decisions.
7. Prefer compact aggregates over raw debug.
8. Keep learner-facing chunk state backward-compatible: aggregate scoring text stays cumulative, submitted and future chunks stay hidden during practice, and per-chunk telemetry remains optional JSON for the final submitted review.
9. Update the owning doc when behavior changes.
