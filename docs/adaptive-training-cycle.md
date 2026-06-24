# Adaptive Training Cycle

_Last updated: 2026-06-23_

Dicta is a closed adaptive listening loop. This page is the compact entry point for the adaptive training cycle.

Related docs:

- [Adaptive training cycle component guide](./adaptive-training-cycle-cycle.md)
- [Dicta Architecture](./architecture.md)
- [Adaptive Listening Brain](./adaptive-listening-brain.md)
- [Listening-First Architecture](./listening-first-architecture.md)

## One-line model

The runtime loop is causal: memory feeds preparation, preparation drives the current session, the session produces evidence, and that evidence updates the next turn. Benchmark and feedback feed the training prescription. The prescription guides LLM generation. The planner turns generated text into playable chunks. The controller chooses live pacing. The runtime pipeline makes the decision executable. Browser TTS speaks the chunk, then safe pauses are completion-gated so the next chunk can start after the configured minimum mental rest once the learner has typed the current chunk, or when the configured fallback expires. Telemetry updates benchmark and feedback. The insight report explains the full loop.

## Workspace map

The Adaptive Pace Layer Flow workspace explains the loop as four auditable groups. Phase 1 / Generation also contains the live direct OpenRouter Generate Training Session card. Step 5 / Playback loop contains the local safe-pause gate controls for Browser TTS minimum mental rest and max fallback. The generation card now uses the same `direct-training` path as Training Mode, owns the locally persisted 2-5 minute duration preference, shows the final prompt sent to OpenRouter, and offers no-context and "my context" prompt variants. Training Mode does not expose a duration selector; its direct generation labels, help text, and OpenRouter job duration reflect the Phase 1 selector.

- Memory: 20-day benchmark, recent feedback, and active `browser-tts/{language}` calibration.
- Prepare: Generation, Planner, and Chunker convert evidence into content, runtime policy, and playable chunks.
- Run: Browser TTS and the Playback loop execute the current session and collect live pressure.
- Learn: Scoring, Telemetry, Benchmark, and Adaptation return evidence to the next cycle.

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
8. Update the owning doc when behavior changes.
