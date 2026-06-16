import { toSyncRows } from '../../src/core/supabaseSync';

type SyncRowSeed = Parameters<typeof toSyncRows>[1][number];
type SessionStatus = 'ready' | 'finished';

type SessionRowArgs = {
  updatedAt: string;
  status?: SessionStatus;
  marker?: string;
  itemKey?: string;
  payload?: Record<string, unknown>;
};

type FeedbackRowArgs = {
  updatedAt: string;
  itemKey?: string;
  sessionId?: string;
  completedAt?: string;
};

type TombstoneRowArgs = {
  updatedAt: string;
  deletedAt?: string;
  itemKey?: string;
};

export function syncRows(...items: SyncRowSeed[]) {
  return toSyncRows('profile-1', items);
}

export function sessionRow({
  updatedAt,
  status = 'ready',
  marker,
  itemKey = 's1',
  payload = {},
}: SessionRowArgs): SyncRowSeed {
  return {
    itemType: 'session',
    itemKey,
    updatedAt,
    payload: {
      id: itemKey,
      updatedAt,
      inputMode: 'input2',
      status,
      ...(marker ? { marker } : {}),
      ...payload,
    },
  };
}

export function feedbackRow({
  updatedAt,
  itemKey = 's1',
  sessionId = itemKey,
  completedAt = updatedAt,
}: FeedbackRowArgs): SyncRowSeed {
  return {
    itemType: 'feedback',
    itemKey,
    updatedAt,
    payload: {
      sessionId,
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-03T10:00:00.000Z',
      completedAt,
    },
  };
}

export function tombstoneRow({ updatedAt, deletedAt = updatedAt, itemKey = 's1' }: TombstoneRowArgs): SyncRowSeed {
  return {
    itemType: 'session',
    itemKey,
    updatedAt,
    payload: {
      id: itemKey,
      deleted: true,
      deletedAt,
      updatedAt,
    },
  };
}
