import { asRecord } from './records';

export function isSessionTombstonePayload(payload: unknown): boolean {
  return asRecord(payload).deleted === true;
}

export function hasMalformedDeletedFlag(payload: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(payload, 'deleted') && typeof payload.deleted !== 'boolean';
}
