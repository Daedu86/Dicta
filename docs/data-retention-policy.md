# Dicta Data Retention Policy

This document records the current data-retention policy for Dicta production data.

## Retention summary

| Data category | Retention period | Storage behavior | Purpose |
| --- | ---: | --- | --- |
| User accounts, profiles, roles, and access metadata | Indefinite | Kept until explicitly removed by an admin/user-management action. | Required for users to access the application and keep their role/admin/member state. |
| User settings and required profile configuration | Indefinite | Kept until explicitly changed or removed. | Required for the app to preserve user configuration. |
| Active session records | 20 rolling days | Active records older than 20 days are expired into tombstones. | Keeps the app focused on recent practice data and prevents unbounded session growth. |
| Telemetry embedded in session records | 20 rolling days | Retained only while the active session record is retained. When the session expires, the telemetry is removed with the active payload. | Supports recent diagnostics and dashboard calculations without keeping raw telemetry indefinitely. |
| Adaptive feedback, tuning, and benchmark sync items | 20 rolling days | Active records older than 20 days are expired into lightweight tombstones. | Supports recent adaptive behavior while preventing unbounded growth. |
| Dashboard/session statistics | 20 rolling days | Derived view only; it does not create long-lived historical aggregates. | Shows recent activity, trends, and language stats. |
| Tombstones/deletion metadata | 30 days | Lightweight deletion markers are kept for 30 days, then permanently deleted. | Prevents old/offline clients from re-uploading deleted or expired records during sync. |

## Effective policy

- **20 days** is the retention window for application activity data: sessions, session telemetry, adaptive feedback, tuning, and benchmark sync items.
- **30 days** is the retention window for tombstones, which are deletion markers used by the sync layer.
- **Indefinite retention** only applies to user/account identity data and minimal required settings/configuration.
- Clients whose last successful sync is older than the 30-day tombstone window must full-refresh before pushing local rows.

## Tombstone payloads

Tombstones are intentionally lightweight. They do not preserve the full session, telemetry, benchmark, or feedback payload. They only preserve enough metadata for sync reconciliation.

## Operational notes

- Dashboard and leaderboard 20-day counts are derived from current local/Supabase data and active filters. They are not hard-coded quotas, monthly limits, or calendar-month totals.
- Activity data older than 20 days is not kept as active payload.
- Tombstones are metadata only and are expected to remain small.

## Supabase migration application

The local migration `supabase/migrations/20260618182042_dicta_sync_retention_20_30.sql` defines the retention sync changes: `server_version`, the insert/update trigger, the tombstone expiry index, active payload expiry into tombstones after 20 days, and tombstone cleanup after 30 days.

Do not assume production has this migration until Supabase migration history confirms it. From an authenticated and linked Supabase CLI checkout, preview and apply with:

```bash
supabase db push --dry-run
supabase db push
```

Use the project's normal secure Supabase credentials flow. Do not hardcode project secrets or database passwords in docs, source, or committed scripts.
