import { describe, expect, it } from 'vitest';

import { buildSyncItems, mergeSyncRows, toSyncRows } from '../../src/core/supabaseSync';
import { baseState } from './fixtures';

describe('supabaseSync row merging', () => {
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

  it('repairs a remote pending session when completed feedback exists for the same session', () => {
    const rows = toSyncRows('profile-1', [
      {
        itemType: 'session',
        itemKey: 's1',
        updatedAt: '2026-05-03T10:00:00.000Z',
        payload: {
          id: 's1',
          updatedAt: '2026-05-03T10:00:00.000Z',
          inputMode: 'input2',
          status: 'ready',
          telemetry: { actions: [], lagSeries: [], wpmSeries: [], accuracySeries: [] },
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
          marker: 'completed-feedback',
        },
      },
    ]);

    const merged = mergeSyncRows({ sessions: [], benchmarks: {}, feedback: {} }, rows);

    expect(merged.sessions).toHaveLength(1);
    expect(merged.sessions[0]).toMatchObject({
      id: 's1',
      status: 'finished',
      updatedAt: '2026-05-03T10:08:00.000Z',
      telemetry: {
        finishedAt: '2026-05-03T10:08:00.000Z',
      },
    });
    expect(merged.feedback['browser-tts'].de[0]).toMatchObject({ marker: 'completed-feedback' });
  });
});
