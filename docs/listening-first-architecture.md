# Listening-First Architecture

Dicta's current training architecture is listening-first. Typing speed remains useful as a diagnostic signal, but it must not dominate the training prescription, session score, or user-facing training language.

## Product language

User-facing training intents are:

| User-facing label | Internal historical values | Purpose |
| --- | --- | --- |
| `Precision` | `easy`, `recover`, `Easy direct session`, legacy `Express easy direct session` | Rebuild listening recall with shorter, clearer phrases, stronger content-word anchors, safer boundaries, and a safer completion window. |
| `Stabilize` | `normal`, `progress`, `Intermediate direct session`, legacy `Express intermediate direct session` | Keep flow steady while protecting word order, semantic phrase boundaries, function-word accuracy, and controlled pacing. |
| `Challenge` | `hard`, `challenge`, `Advanced direct session`, legacy `Express advanced direct session` | Increase density only when listening precision, flow, word order, and completion-window timing are stable. |

The historical values above are still valid storage and routing values. Do not migrate them just to change copy. Express is legacy-compatible metadata, not a separate visible mode. UI, leaderboard grouping, OpenRouter notices, and notifications should translate legacy express metadata into `Precision`, `Stabilize`, or `Challenge` through presentation helpers.

## Listening precision signals

The listening-first score and policy use explicit listening precision metrics instead of treating raw WPM as the main target:

- `listeningRecallScore`
- `contentWordRecall`
- `detailPrecisionScore`
- `functionWordAccuracy`
- `wordOrderAccuracy`
- `omissionRate`
- `completionWindowScore`

`completionWindowScore` captures whether missing words were recovered before playback ended. A learner who eventually types the words, but only after the audio window has passed, should not be treated the same as a learner who completed the phrase inside the listening window.

## Runtime responsibilities

- `listeningPrecisionMetrics` computes listening-specific precision signals from session attempts.
- `sessionScore` weights listening precision explicitly; WPM is diagnostic, not the main score driver.
- `AdaptiveDictationController` uses listening precision and completion-window pressure to cap unsafe speed increases.
- `ListeningTrainerPolicy` converts benchmark context, latest feedback, and user intent into a `ListeningTrainingPrescription`.
- `TrainingGenerationCard`, `LeaderboardWorkspace`, `formatDifficultyLabel`, and `trainingNotifications` translate legacy difficulty/job identifiers into `Precision`, `Stabilize`, and `Challenge` for the user.

## Policy guardrails

`ListeningTrainerPolicy` must remain pure and profile-scoped:

- It receives one `(inputMode, language)` benchmark profile.
- It may read the latest matching session feedback passed to it.
- It must not read `localStorage`, call network APIs, mutate benchmark state, or average across languages or inputs.
- It may downgrade unsafe challenge intent to stabilization or recovery when precision pressure is high.
- It must keep `browser-tts/en` and `browser-tts/de` behavior independent and deterministic.

## Compatibility matrix

| Layer | Keep legacy values? | Show new labels? | Notes |
| --- | --- | --- | --- |
| Stored sessions | Yes | No | `difficulty: easy | normal | hard` remains the persistence contract. |
| DictationScript schema | Yes | No | LLM output and validation still use `easy`, `normal`, `hard`. |
| OpenRouter durable jobs | Yes | Yes | Legacy express `slotLabel` strings stay readable, but notices map them to canonical modes. New direct buttons use standard two-minute slot labels. |
| Leaderboard section ids | No express IDs | Yes | Active sections are `precision`, `stabilize`, and `challenge`; historical express-duration sessions are grouped by stored difficulty. |
| Mobile generation buttons | Legacy-compatible only | Yes | Direct buttons are `easy`, `medium`, and `hard`, displayed as canonical modes. Legacy `express-*` button ids map to canonical labels if encountered. |
| Session cards / pending sessions | Yes | Yes | `formatDifficultyLabel()` maps difficulty to intent labels. |
| Notifications | Yes | Yes | Notification body uses intent labels only; job metadata is preserved in notification data. |
| Tests for storage/routes/jobs | Yes | Usually no | Keep legacy expectations where they assert internal contracts. |
| UI/copy tests | Yes | Yes | Assert `Precision`, `Stabilize`, and `Challenge` for visible labels. |

## Change checklist

When changing adaptive behavior or copy, verify the affected layer first:

1. Runtime behavior change: update focused policy/controller tests.
2. Score or metric change: update `sessionScore` and `listeningPrecisionMetrics` tests.
3. User-facing copy change: update UI/copy tests and keep legacy internal values unchanged.
4. OpenRouter prompt/schema change: update dictation script validation or generation tests without changing stored session contracts unless explicitly required.
5. Cross-language change: state why neighboring `(inputMode, language)` profiles remain isolated.

## Current phase baseline

The current baseline is:

- Listening precision metrics are explicit.
- Session score is listening-first.
- Speed increases are capped by listening precision.
- Completion-window timing is measured and weighted.
- `ListeningTrainerPolicy` reacts to precision pressure.
- Mobile buttons, descriptions, leaderboard sections, session difficulty labels, OpenRouter notices, and notifications use `Precision`, `Stabilize`, and `Challenge`.
- Legacy express jobs and historical short sessions are compatible but grouped into the same three visible modes.
- Legacy internal values remain in place for compatibility.
