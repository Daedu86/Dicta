# Legacy multi-input snapshot

Date: 2026-06-05
Repository: Daedu86/Dicta
Legacy branch: main
Legacy marker branch: legacy/multi-input-2026-06-05
New product branch: product/input-2

## Purpose

This document marks the point where the original multi-input Dicta product line is frozen as legacy history before starting the official input-2-only product line.

## Legacy scope preserved in main

- Four input modes.
- Five languages.
- Multi-input dashboard.
- Multi-input leaderboard.
- Multi-input admin surfaces.
- Existing adaptive telemetry, OpenRouter prompt generation, and session persistence contracts.

## New official product direction

The active product line moves to `product/input-2`.

The new scope is:

- Input 2 only.
- Five languages for input 2.
- Dashboard focused on input 2.
- Leaderboard focused on input 2.
- Admin simplified around input 2.
- Inactive input surfaces removed or hidden.

## Recovery note

If the input-2-only product line does not remain the right direction, the legacy multi-input state can still be recovered from `main` or from the marker branch `legacy/multi-input-2026-06-05`.

Do not treat `product/input-2` as a temporary feature branch. It is the new official product line unless explicitly changed later.
