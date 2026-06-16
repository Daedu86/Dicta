import { isSubmittedFinishedAttempt } from '../sessionNormalization';

import { asRecord } from './records';
import { compareTimestamp, timestampFrom } from './timestamps';
import { isRemoteNewer } from './rowValidation';
import type { DictaSyncRow } from './types';

export function shouldRemoteSessionReplaceLocal(row: DictaSyncRow, localSession: unknown): boolean {
  if (remoteSubmittedSessionOutranksLocal(row.payload, localSession)) return true;
  return isRemoteNewer(row, localSession, ['updatedAt']);
}

export function shouldLocalSessionSurviveRemoteTombstone(remoteTombstoneRow: DictaSyncRow, localSession: unknown): boolean {
  const localUpdatedAt = timestampFrom(asRecord(localSession).updatedAt);
  return Boolean(
    localUpdatedAt &&
      isSubmittedFinishedSession(localSession) &&
      compareTimestamp(localUpdatedAt, remoteTombstoneRow.updated_at) > 0,
  );
}

export function shouldLocalRowReplaceRemoteTombstone(localRow: DictaSyncRow, remoteTombstoneRow: DictaSyncRow): boolean {
  return (
    localRow.item_type === 'session' &&
    isSubmittedFinishedSession(localRow.payload) &&
    compareTimestamp(localRow.updated_at, remoteTombstoneRow.updated_at) > 0
  );
}

export function remoteSubmittedSessionOutranksLocal(remotePayload: unknown, localPayload: unknown): boolean {
  return isSubmittedFinishedSession(remotePayload) && !isSubmittedFinishedSession(localPayload);
}

export function localSubmittedSessionOutranksRemote(localPayload: unknown, remotePayload: unknown): boolean {
  return isSubmittedFinishedSession(localPayload) && !isSubmittedFinishedSession(remotePayload);
}

export function isSubmittedFinishedSession(payload: unknown): boolean {
  return isSubmittedFinishedAttempt(payload);
}
