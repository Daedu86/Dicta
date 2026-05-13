import { describe, expect, it } from 'vitest';
import { buildSyncItems, mergeSyncRows, toSyncRows, type DictaSyncState } from '../src/core/supabaseSync';

const baseState = (): DictaSyncState => ({
  sessions: [
    {
      id: 's1',
      updatedAt: '2026-05-01T10:00:00.000Z',
      inputMode: 'input2',
    },
  ],
  benchmarks: {
    'browser-tts': {
      en: {
        inputMode: 'browser-tts',
        language: 'en',
        lastUpdatedAt: '2026-05-01T10:00:00.000Z',
      },
    },
  },
  feedback: {
    'browser-tts': {
      en: [
        {
          sessionId: 's1',
          inputMode: 'browser-tts',
          language: 'en',
          createdAt: '2026-05-01T10:00:00.000Z',
          completedAt: '2026-05-01T10:05:00.000Z',
        },
      ],
    },
  },
});

describe('supabaseSync', () => {
  it('serializes sessions, benchmarks, and feedback to sync rows', () => {
    const items = buildSyncItems(baseState());
    expect(items.map((item) => `${item.itemType}:${item.itemKey}`)).toEqual([
      'session:s1',
      'benchmark:browser-tts:en',
      'feedback:s1',
    ]);

    const rows = toSyncRows('profile-1', items);
    expect(rows[0]).toMatchObject({
      profile_id: 'profile-1',
      item_type: 'session',
      item_key: 's1',
      updated_at: '2026-05-01T10:00:00.000Z',
    });
  });

  it('imports new remote items during first-run migration', () => {
    const merged = mergeSyncRows(
      { sessions: [], benchmarks: {}, feedback: {} },
      toSyncRows('profile-1', buildSyncItems(baseState())),
    );

    expect(merged.changed).toBe(true);
    expect(merged.imported).toBe(3);
    expect(merged.sessions).toHaveLength(1);
    expect(merged.benchmarks['browser-tts'].en).toBeTruthy();
    expect(merged.feedback['browser-tts'].en).toHaveLength(1);
  });

  it('imports a new remote phone-created session', () => {
    const remote = baseState();
    remote.sessions = [
      {
        id: 'phone-session',
        updatedAt: '2026-05-13T09:24:41.237Z',
        inputMode: 'input2',
        createdDeviceKind: 'mobile',
        createdDeviceLabel: 'Android Chrome',
      },
    ];

    const merged = mergeSyncRows({ sessions: [], benchmarks: {}, feedback: {} }, toSyncRows('profile-1', buildSyncItems(remote)));

    expect(merged.sessions).toHaveLength(1);
    expect(merged.sessions[0]).toMatchObject({
      id: 'phone-session',
      createdDeviceKind: 'mobile',
      createdDeviceLabel: 'Android Chrome',
    });
  });

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

  it('keeps a newer local session when an older tombstone is received', () => {
    const local = baseState();
    local.sessions = [{ id: 's1', updatedAt: '2026-05-03T10:00:00.000Z', inputMode: 'input2', marker: 'local' }];
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
    expect(merged.sessions[0]).toMatchObject({ marker: 'local' });
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

  it('keeps newer local session and imports newer remote benchmark and feedback', () => {
    const local = baseState();
    local.sessions = [{ id: 's1', updatedAt: '2026-05-03T10:00:00.000Z', inputMode: 'input2', marker: 'local' }];

    const remote = baseState();
    remote.sessions = [{ id: 's1', updatedAt: '2026-05-02T10:00:00.000Z', inputMode: 'input2', marker: 'remote' }];
    remote.benchmarks['browser-tts'].en = {
      inputMode: 'browser-tts',
      language: 'en',
      lastUpdatedAt: '2026-05-04T10:00:00.000Z',
      marker: 'remote',
    };
    remote.feedback['browser-tts'].en = [
      {
        sessionId: 's1',
        inputMode: 'browser-tts',
        language: 'en',
        createdAt: '2026-05-01T10:00:00.000Z',
        completedAt: '2026-05-04T10:05:00.000Z',
        marker: 'remote',
      },
    ];

    const merged = mergeSyncRows(local, toSyncRows('profile-1', buildSyncItems(remote)));

    expect(merged.sessions[0]).toMatchObject({ marker: 'local' });
    expect(merged.benchmarks['browser-tts'].en).toMatchObject({ marker: 'remote' });
    expect(merged.feedback['browser-tts'].en[0]).toMatchObject({ marker: 'remote' });
  });

  it('skips malformed rows safely', () => {
    const merged = mergeSyncRows(baseState(), [
      {
        profile_id: 'profile-1',
        item_type: 'session',
        item_key: 'wrong',
        payload: { id: 'different', updatedAt: '2026-05-05T10:00:00.000Z' },
        updated_at: '2026-05-05T10:00:00.000Z',
      },
      {
        profile_id: 'profile-1',
        item_type: 'benchmark',
        item_key: 'bad-key',
        payload: { lastUpdatedAt: '2026-05-05T10:00:00.000Z' },
        updated_at: '2026-05-05T10:00:00.000Z',
      },
    ]);

    expect(merged.skipped).toBe(2);
    expect(merged.changed).toBe(false);
  });
});
