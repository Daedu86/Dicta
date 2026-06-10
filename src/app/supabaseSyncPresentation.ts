import type { SupabaseSyncStatus } from './useSessionPersistenceSync';

export type PendingSyncSummary = {
  count: number;
  hasPending: boolean;
};

type PendingSyncSession = {
  updatedAt?: string | null;
};

export function formatSupabaseSyncState(status: SupabaseSyncStatus): string {
  if (!status.enabled) return 'Off';
  if (status.state === 'pulling') return 'Pulling';
  if (status.state === 'pushing') return 'Pushing';
  if (status.state === 'error') return 'Error';
  if (status.state === 'synced') return 'Synced';
  return 'Ready';
}

export function countLocalChangesPendingSync({
  sessions,
  benchmarks,
  feedback,
  lastSyncedAt,
}: {
  sessions: PendingSyncSession[];
  benchmarks: unknown;
  feedback: unknown;
  lastSyncedAt: string | null;
}): PendingSyncSummary {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const benchmarkInputs = benchmarks && typeof benchmarks === 'object' ? Object.values(benchmarks) : [];
  const feedbackInputs = feedback && typeof feedback === 'object' ? Object.values(feedback) : [];

  if (!lastSyncedAt) {
    const totalFeedback = feedbackInputs.reduce((inputTotal, byLanguage) => {
      const lists = byLanguage && typeof byLanguage === 'object' ? Object.values(byLanguage) : [];
      return (
        inputTotal +
        lists.reduce<number>(
          (languageTotal, list) => languageTotal + (Array.isArray(list) ? list.length : 0),
          0,
        )
      );
    }, 0);

    const totalBenchmarks = benchmarkInputs.reduce((inputTotal, byLanguage) => {
      if (!byLanguage || typeof byLanguage !== 'object') return inputTotal;
      return inputTotal + Object.keys(byLanguage).length;
    }, 0);

    const count = safeSessions.length + totalBenchmarks + totalFeedback;
    return { count, hasPending: count > 0 };
  }

  const lastSyncedTime = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(lastSyncedTime)) return { count: 0, hasPending: false };

  let count = safeSessions.filter((session) => isTimestampAfterSync(session.updatedAt, lastSyncedTime)).length;

  for (const byLanguage of benchmarkInputs) {
    if (!byLanguage || typeof byLanguage !== 'object') continue;
    for (const benchmark of Object.values(byLanguage)) {
      const record = benchmark as { lastUpdatedAt?: unknown };
      if (isTimestampAfterSync(String(record.lastUpdatedAt ?? ''), lastSyncedTime)) {
        count += 1;
      }
    }
  }

  for (const byLanguage of feedbackInputs) {
    if (!byLanguage || typeof byLanguage !== 'object') continue;
    for (const list of Object.values(byLanguage)) {
      if (!Array.isArray(list)) continue;
      count += list.filter((item) => isTimestampAfterSync(getFeedbackTimestamp(item), lastSyncedTime)).length;
    }
  }

  return { count, hasPending: count > 0 };
}

function getFeedbackTimestamp(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const record = item as { completedAt?: unknown; createdAt?: unknown };
  return String(record.completedAt ?? record.createdAt ?? '');
}

function isTimestampAfterSync(value: string | null | undefined, lastSyncedTime: number): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > lastSyncedTime;
}
