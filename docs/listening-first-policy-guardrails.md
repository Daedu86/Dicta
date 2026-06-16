# Listening-First Policy Guardrails

`ListeningTrainerPolicy` must remain pure and profile-scoped.

- It receives one `(inputMode, language)` benchmark profile.
- It may read the latest matching session feedback passed to it.
- It must not read `localStorage`, call network APIs, mutate benchmark state, or average across languages or inputs.
- It may downgrade unsafe challenge intent when precision pressure is high.
- It must keep `browser-tts/en` and `browser-tts/de` behavior independent and deterministic.
