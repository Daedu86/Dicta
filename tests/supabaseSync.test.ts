import { describe, expect, it } from 'vitest';
import {
  buildSyncItems,
  getDictaSyncConfig,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  selectPushableSyncRows,
  toSyncRows,
  type DictaSyncState,
} from '../src/core/supabaseSync';

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
  it('treats Supabase URL and anon key as auth-capable even before a profile is resolved', () => {
    const config = getDictaSyncConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      VITE_SUPABASE_SYNC_PROFILE_ID: '',
    });

    expect(config.authRequired).toBe(true);
    expect(config.enabled).toBe(false);
    expect(config.legacyProfileId).toBe('');
  });

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

  it('imports a submitted remote session over a newer local pending copy', () => {
    const local = baseState();
    local.sessions = [{
      id: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      inputMode: 'input2',
      status: 'ready',
      marker: 'desktop-pending',
    }];

    const remote = baseState();
    remote.sessions = [{
      id: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      inputMode: 'input2',
      status: 'finished',
      telemetry: { actions: [{ action: 'submit' }] },
      marker: 'phone-submitted',
    }];

    const merged = mergeSyncRows(local, toSyncRows('profile-1', buildSyncItems(remote)));

    expect(merged.sessions[0]).toMatchObject({ marker: 'phone-submitted', status: 'finished' });
  });

  it('imports a finalized remote session over a newer local pending copy when submit action is missing', () => {
    const local = baseState();
    local.sessions = [{
      id: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      inputMode: 'input2',
      status: 'ready',
      marker: 'phone-pending',
    }];

    const remote = baseState();
    remote.sessions = [{
      id: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      inputMode: 'input2',
      status: 'finished',
      telemetry: {
        finishedAt: '2026-05-02T10:00:00.000Z',
        actions: [],
      },
      marker: 'desktop-finalized',
    }];

    const merged = mergeSyncRows(local, toSyncRows('profile-1', buildSyncItems(remote)));

    expect(merged.sessions[0]).toMatchObject({ marker: 'desktop-finalized', status: 'finished' });
  });

  it('does not push a stale local pending session over a submitted remote session', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'ready',
        marker: 'desktop-pending',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-02T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        telemetry: { actions: [{ action: 'submit' }] },
        marker: 'phone-submitted',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over a finalized remote session without submit action', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'ready',
        marker: 'phone-pending',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-02T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        telemetry: {
          finishedAt: '2026-05-02T10:00:00.000Z',
          actions: [],
        },
        marker: 'desktop-finalized',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over a finished remote TTS session with missing telemetry markers', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'ready',
        marker: 'desktop-pending',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-02T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        ttsText: 'Bonjour tout le monde',
        ttsPracticeText: 'Bonjour tout le monde',
        metrics: { wpm: 38, points: 0, score: 0 },
        telemetry: { actions: [] },
        marker: 'mobile-submitted-no-marker',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over a finished remote TTS session with score signals but empty practice text', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'ready',
        marker: 'desktop-pending',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-02T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        ttsText: 'Alltägliche Erlebnisse im Park',
        ttsPracticeText: '',
        metrics: { points: 78, score: 297, wpm: 31.2 },
        telemetry: { actions: [] },
        marker: 'mobile-finished-score-signals',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('allows a submitted local phone session to repair a newer remote pending copy', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-02T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        telemetry: { actions: [{ action: 'submit' }] },
        marker: 'phone-submitted',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'ready',
        marker: 'desktop-pending',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toHaveLength(1);
  });

  it('merges incremental remote snapshots by sync row identity', () => {
    const currentRows = toSyncRows('profile-1', buildSyncItems(baseState()));
    const changedRows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        updatedAt: '2026-05-04T10:00:00.000Z',
        payload: {
          id: 's1',
          updatedAt: '2026-05-04T10:00:00.000Z',
          inputMode: 'input2',
          marker: 'changed',
        },
      },
    ]);

    const mergedRows = mergeSyncRowSnapshots(currentRows, changedRows);

    expect(mergedRows).toHaveLength(currentRows.length);
    expect(mergedRows.find((row) => row.item_type === 'session' && row.item_key === 's1')?.payload).toMatchObject({
      marker: 'changed',
    });
    expect(latestSyncRowTimestamp(mergedRows)).toBe('2026-05-04T10:00:00.000Z');
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
