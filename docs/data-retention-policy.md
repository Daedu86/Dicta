# Dicta Data Retention Policy

This document records the current data-retention policy for Dicta production data.

## Retention summary

| Data category | Retention period | Storage behavior | Purpose |
| --- | ---: | --- | --- |
| User accounts, profiles, roles, and access metadata | Indefinite | Kept until explicitly removed by an admin/user-management action. | Required for users to access the application and keep their role/admin/member state. |
| User settings and required profile configuration | Indefinite | Kept until explicitly changed or removed. | Required for the app to preserve user configuration. |
| Active session records | 30 rolling days | Active records older than 30 days are expired into tombstones. | Keeps the app focused on recent practice data and prevents unbounded session growth. |
| Telemetry embedded in session records | 30 rolling days | Retained only while the active session record is retained. When the session expires, the telemetry is removed with the active payload. | Supports recent diagnostics and dashboard calculations without keeping raw telemetry indefinitely. |
| Adaptive feedback, tuning, and benchmark sync items | 30 rolling days | Active records older than 30 days are expired into lightweight tombstones. | Supports recent adaptive behavior while preventing unbounded growth. |
| Dashboard/session statistics | 30 rolling days | Derived view only; it does not create long-lived historical aggregates. | Shows recent activity, trends, and language stats. |
| Tombstones/deletion metadata | 90 days | Lightweight deletion markers are kept for 90 days, then permanently deleted. | Prevents old/offline clients from re-uploading deleted or expired records during sync. |

## Effective policy

- **30 days** is the retention window for application activity data: sessions, session telemetry, adaptive feedback, tuning, and benchmark sync items.
- **90 days** is the retention window for tombstones, which are deletion markers used by the sync layer.
- **Indefinite retention** only applies to user/account identity data and minimal required settings/configuration.

## Tombstone payloads

Tombstones are intentionally lightweight. They do not preserve the full session, telemetry, benchmark, or feedback payload. They only preserve enough metadata for sync reconciliation.

## Operational notes

- The dashboard `Month` metric is a rolling 30-day view, not a calendar-month total.
- Activity data older than 30 days is not kept as active payload.
- Tombstones are metadata only and are expected to remain small.
