# Listening-First Compatibility Matrix

| Layer | Keep legacy values? | Show new labels? | Notes |
| --- | --- | --- | --- |
| Stored sessions | Yes | No | `difficulty: easy | normal | hard` remains the persistence contract. |
| DictationScript schema | Yes | No | LLM output and validation still use `easy`, `normal`, `hard`. |
| OpenRouter durable jobs | Yes | Yes | Legacy express `slotLabel` strings stay readable, but notices map them to canonical modes. |
| Leaderboard section ids | No express IDs | Yes | Active sections are `precision`, `stabilize`, and `challenge`. |
| Mobile generation buttons | Legacy-compatible only | Yes | Legacy `express-*` button ids map to canonical labels if encountered. |
| Session cards / pending sessions | Yes | Yes | `formatDifficultyLabel()` maps difficulty to intent labels. |
| Notifications | Yes | Yes | Notification body uses intent labels only. |
| Tests for storage/routes/jobs | Yes | Usually no | Keep legacy expectations where they assert internal contracts. |
| UI/copy tests | Yes | Yes | Assert `Precision`, `Stabilize`, and `Challenge` for visible labels. |
