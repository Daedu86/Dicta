import { describe, expect, it } from 'vitest';

import { buildSyncItems, mergeSyncRows, toSyncRows } from '../../src/core/supabaseSync';
import { baseState } from './fixtures';

describe('supabaseSync tombstones', () => {
  it('removes a local session when Supabase has a newer tombstone', () => {
    const local = baseState();
    const rows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        payload: {
          id: 's1',
          deleted: true,
          deletedAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);

    const merged = mergeSyncRows(local, rows);

    expect(merged.sessions).toHaveLength(0);
    expect(merged.deletedSessionIds).toEqual(['s1']);
  });

  it('removes a newer local pending session when an older tombstone is received', () => {
    const local = baseState();
    local.sessions = [{ id: 's1', updatedAt: '2026-05-03T10:00:00.000Z', inputMode: 'input2', status: 'ready', marker: 'local' }];
    const rows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        payload: {
          id: 's1',
          deleted: true,
          deletedAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);

    const merged = mergeSyncRows(local, rows);

    expect(merged.sessions).toHaveLength(0);
    expect(merged.deletedSessionIds).toEqual(['s1']);
  });

  it('keeps a newer submitted local session when an older tombstone is received', () => {
    const local = baseState();
    local.sessions = [
      {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        telemetry: { actions: [{ action: 'submit' }] },
        marker: 'local-submitted',
      },
    ];
    const rows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        payload: {
          id: 's1',
          deleted: true,
          deletedAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);

    const merged = mergeSyncRows(local, rows);

    expect(merged.sessions).toHaveLength(1);
    expect(merged.sessions[0]).toMatchObject({ marker: 'local-submitted' });
    expect(merged.deletedSessionIds).toEqual([]);
  });

  it('does not re-push a session removed by a tombstone', () => {
    const rows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        payload: {
          id: 's1',
          deleted: true,
          deletedAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);

    const merged = mergeSyncRows(baseState(), rows);
    const nextItems = buildSyncItems(merged);

    expect(nextItems.some((item) => item.itemType === 'session' && item.itemKey === 's1')).toBe(false);
  });

  it('skips malformed string tombstones instead of importing them as sessions', () => {
    const rows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        payload: {
          id: 's1',
          deleted: 'true',
          deletedAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);

    const merged = mergeSyncRows({ sessions: [], benchmarks: {}, feedback: {} }, rows);

    expect(merged.sessions).toHaveLength(0);
    expect(merged.skipped).toBe(1);
    expect(merged.deletedSessionIds).toEqual([]);
  });
});
