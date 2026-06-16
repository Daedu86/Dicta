import { cloneFeedbackRecord, cloneNestedRecord } from './cloneState';
import { collectCompletedFeedbackEvidence } from './feedbackEvidence';
import { asRecord, getStringField } from './records';
import { isRemoteNewer, isValidSyncRow, splitBenchmarkKey } from './rowValidation';
import {
  shouldLocalSessionSurviveRemoteTombstone,
  shouldRemoteSessionReplaceLocal,
} from './sessionConflictPolicy';
import { hasMalformedDeletedFlag, isSessionTombstonePayload } from './sessionTombstones';
import { repairPendingSessionFromCompletedFeedback } from './sessionRepair';
import { compareTimestamp, getFeedbackTimestamp } from './timestamps';
import type { DictaSyncMergeResult, DictaSyncRow, DictaSyncState } from './types';

export function mergeSyncRows(local: DictaSyncState, rows: DictaSyncRow[]): DictaSyncMergeResult {
  let changed = false;
  let imported = 0;
  let skipped = 0;
  const completedFeedbackBySessionId = collectCompletedFeedbackEvidence(rows);
  const sessionsById = new Map<string, unknown>();
  for (const session of local.sessions) {
    const id = getStringField(session, 'id');
    if (id) sessionsById.set(id, session);
  }

  const benchmarks: Record<string, Record<string, unknown>> = cloneNestedRecord(local.benchmarks);
  const feedback: Record<string, Record<string, unknown[]>> = cloneFeedbackRecord(local.feedback);
  const deletedSessionIds = new Set<string>();

  for (const row of rows) {
    if (!isValidSyncRow(row)) {
      skipped += 1;
      continue;
    }

    if (row.item_type === 'session') {
      const remote = asRecord(row.payload);
      const id = typeof remote.id === 'string' ? remote.id : '';
      if (!id || id !== row.item_key) {
        skipped += 1;
        continue;
      }
      if (hasMalformedDeletedFlag(remote)) {
        skipped += 1;
        continue;
      }
      if (isSessionTombstonePayload(remote)) {
        const localSession = sessionsById.get(id);
        if (localSession && !shouldLocalSessionSurviveRemoteTombstone(row, localSession)) {
          deletedSessionIds.add(id);
          sessionsById.delete(id);
          changed = true;
          imported += 1;
        } else if (!localSession) {
          deletedSessionIds.add(id);
        }
        continue;
      }
      const localSession = sessionsById.get(id);
      if (!localSession || shouldRemoteSessionReplaceLocal(row, localSession)) {
        sessionsById.set(id, repairPendingSessionFromCompletedFeedback(row.payload, completedFeedbackBySessionId.get(id)));
        changed = true;
        imported += 1;
      }
      continue;
    }

    if (row.item_type === 'benchmark') {
      const [inputMode, language] = splitBenchmarkKey(row.item_key);
      if (!inputMode || !language) {
        skipped += 1;
        continue;
      }
      const localBenchmark = benchmarks[inputMode]?.[language];
      if (!localBenchmark || isRemoteNewer(row, localBenchmark, ['lastUpdatedAt'])) {
        benchmarks[inputMode] = {
          ...(benchmarks[inputMode] ?? {}),
          [language]: row.payload,
        };
        changed = true;
        imported += 1;
      }
      continue;
    }

    const sessionId = row.item_key;
    const remoteSessionId = getStringField(row.payload, 'sessionId');
    const inputMode = getStringField(row.payload, 'inputMode');
    const language = getStringField(row.payload, 'language');
    if (!inputMode || !language || !sessionId || remoteSessionId !== sessionId) {
      skipped += 1;
      continue;
    }
    const inputFeedback = feedback[inputMode] ?? {};
    const languageFeedback = inputFeedback[language] ?? [];
    const index = languageFeedback.findIndex((item) => getStringField(item, 'sessionId') === sessionId);
    const localFeedback = index >= 0 ? languageFeedback[index] : null;
    if (!localFeedback || isRemoteNewer(row, localFeedback, ['completedAt', 'createdAt'])) {
      const nextLanguageFeedback = [...languageFeedback];
      if (index >= 0) {
        nextLanguageFeedback[index] = row.payload;
      } else {
        nextLanguageFeedback.push(row.payload);
      }
      nextLanguageFeedback.sort((a, b) => compareTimestamp(getFeedbackTimestamp(b), getFeedbackTimestamp(a)));
      feedback[inputMode] = {
        ...inputFeedback,
        [language]: nextLanguageFeedback.slice(0, 12),
      };
      changed = true;
      imported += 1;
    }
  }

  for (const [sessionId, session] of sessionsById) {
    const repairedSession = repairPendingSessionFromCompletedFeedback(session, completedFeedbackBySessionId.get(sessionId));
    if (repairedSession !== session) {
      sessionsById.set(sessionId, repairedSession);
      changed = true;
      imported += 1;
    }
  }

  return {
    sessions: Array.from(sessionsById.values()).sort((a, b) => compareTimestamp(getStringField(b, 'updatedAt'), getStringField(a, 'updatedAt'))),
    benchmarks,
    feedback,
    changed,
    imported,
    skipped,
    deletedSessionIds: [...deletedSessionIds],
  };
}
