# Adaptive Listening Brain Boundaries

Guardrails:

- `support` handles low accuracy, high correction pressure, phrase overload, unsafe boundaries, and replay/error pressure.
- `recovery` handles lag/catch-up pressure only.
- `progressGap` may extend pause behavior but must not force a downgrade by itself.
- French and Portuguese profiles stay base-equivalent until evidence says otherwise.
- `ListeningTrainerPolicy` stays separate from `PacingDecision.reasonCodes`.
- Do not mix behavior across `(inputMode, language)` profiles.

Known gaps:

- Real `backspaceRate` from key/edit telemetry.
- Evidence-based French and Portuguese tuning.
- Reason-code migration for dynamic legacy tokens.
- Better UI/debug surfacing for structured reason codes.
- Longer-term calibration by user, language, and input.
