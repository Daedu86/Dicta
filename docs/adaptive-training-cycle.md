# Adaptive Training Cycle

_Last updated: 2026-06-16_

Dicta is a closed adaptive listening loop. This page is the compact entry point for the adaptive training cycle.

Related docs:

- [Adaptive training cycle component guide](./adaptive-training-cycle-cycle.md)
- [Dicta Architecture](./architecture.md)
- [Adaptive Listening Brain](./adaptive-listening-brain.md)
- [Listening-First Architecture](./listening-first-architecture.md)

## One-line model

Benchmark and feedback feed the training prescription. The prescription guides LLM generation. The planner turns generated text into playable chunks. The controller chooses live pacing. The runtime pipeline makes the decision executable. Browser TTS speaks the chunk. Telemetry updates benchmark and feedback. The insight report explains the full loop.

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

1. Scope adaptive behavior by input mode and language.
2. Do not leak Browser TTS German recovery behavior into other languages.
3. Treat WPM as diagnostic.
4. Keep runtime pacing out of the LLM.
5. Keep content generation out of the controller.
6. Surface runtime modifications to controller decisions.
7. Prefer compact aggregates over raw debug.
8. Update the owning doc when behavior changes.
