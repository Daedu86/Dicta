import { describe, expect, it } from 'vitest';

import { selectPushableSyncRows, toSyncRows } from '../../src/core/supabaseSync';

describe('supabaseSync pushable rows', () => {
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

  it('does not push a stale local pending session over completed remote feedback', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:10:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:10:00.000Z',
        inputMode: 'input2',
        status: 'ready',
        marker: 'local-pending',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        payload: {
          id: 's1',
          updatedAt: '2026-05-03T10:00:00.000Z',
          inputMode: 'input2',
          status: 'ready',
          marker: 'remote-pending',
        },
      },
      {
        itemType: 'feedback',
        itemKey: 's1',
        updatedAt: '2026-05-03T10:08:00.000Z',
        payload: {
          sessionId: 's1',
          inputMode: 'browser-tts',
          language: 'de',
          createdAt: '2026-05-03T10:00:00.000Z',
          completedAt: '2026-05-03T10:08:00.000Z',
        },
      },
    ]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('allows a repaired local finished session to replace a remote pending session with completed feedback', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:08:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:08:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        telemetry: { finishedAt: '2026-05-03T10:08:00.000Z', actions: [] },
        marker: 'local-repaired',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        updatedAt: '2026-05-03T10:10:00.000Z',
        payload: {
          id: 's1',
          updatedAt: '2026-05-03T10:10:00.000Z',
          inputMode: 'input2',
          status: 'ready',
          marker: 'remote-pending',
        },
      },
      {
        itemType: 'feedback',
        itemKey: 's1',
        updatedAt: '2026-05-03T10:08:00.000Z',
        payload: {
          sessionId: 's1',
          inputMode: 'browser-tts',
          language: 'de',
          createdAt: '2026-05-03T10:00:00.000Z',
          completedAt: '2026-05-03T10:08:00.000Z',
        },
      },
    ]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toHaveLength(1);
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

  it('does not push a stale submitted local session over a newer remote tombstone', () => {
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
        deleted: true,
        deletedAt: '2026-05-03T10:00:00.000Z',
        updatedAt: '2026-05-03T10:00:00.000Z',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a newer local pending session over an older remote tombstone', () => {
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
        deleted: true,
        deletedAt: '2026-05-02T10:00:00.000Z',
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('allows a newer submitted local session to repair an older remote tombstone', () => {
    const localRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-03T10:00:00.000Z',
      payload: {
        id: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        inputMode: 'input2',
        status: 'finished',
        telemetry: { actions: [{ action: 'submit' }] },
        marker: 'desktop-submitted',
      },
    }]);
    const remoteRows = toSyncRows('profile-1', [{
      itemType: 'session',
      itemKey: 's1',
      updatedAt: '2026-05-02T10:00:00.000Z',
      payload: {
        id: 's1',
        deleted: true,
        deletedAt: '2026-05-02T10:00:00.000Z',
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    }]);

    expect(selectPushableSyncRows(localRows, remoteRows)).toHaveLength(1);
  });
});
