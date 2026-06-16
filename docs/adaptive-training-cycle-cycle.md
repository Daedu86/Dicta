# Adaptive Training Cycle Component Guide

Detailed notes moved out of the compact root index.

## Components

- Benchmark: durable memory per input mode and language.
- Feedback: completed-session diagnosis and next-session pressure.
- ListeningTrainerPolicy: recipe from memory, feedback, and intent.
- LLM generation: structured training material only.
- Pre-TTS planner: safe playable chunks.
- AdaptiveDictationController: live pacing intent.
- Runtime decision pipeline: executable Browser TTS decision.
- Browser TTS: final audio execution.
- Telemetry: facts from the current session.
- Insight report: readable explanation of the loop.

## Checkpoints

1. Memory.
2. Prescription.
3. Generation.
4. Planning.
5. Controller decision.
6. Runtime execution policy.
7. Audio execution.
8. Telemetry update.
9. Insight report.

## Routing

- Content mismatch: policy and generation.
- Unnatural audio cuts: planner.
- Surprising speed or pause: controller and runtime policy.
- Stale recommendation: benchmark recency and environment.
- Hard-to-read report: report schema and summaries.
