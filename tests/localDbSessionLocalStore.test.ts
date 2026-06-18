import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createMemoryDictaLocalDbAdapter,
  setDictaLocalDbAdapterForTests,
} from '../src/core/localDb/dictaLocalDb';
import {
  loadDeletedSessionIds,
  loadSessions,
  saveDeletedSessionIds,
  saveSessions,
} from '../src/core/localDb/sessionLocalStore';
import type { SessionTelemetry } from '../src/types/dictation';

type StoreSession = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  telemetry: SessionTelemetry;
};

const nowMs = Date.parse('2026-06-18T12:00:00.000Z');

beforeEach(() => {
  setDictaLocalDbAdapterForTests(createMemoryDictaLocalDbAdapter());
});

afterEach(() => {
  setDictaLocalDbAdapterForTests(null);
});

describe('sessionLocalStore', () => {
  it('keeps old ready/running/paused sessions but omits expired finished/error payloads', async () => {
    await saveSessions('profile-a', [
      session('old-ready', 'ready', '2026-04-01T00:00:00.000Z'),
      session('old-running', 'running', '2026-04-01T00:00:00.000Z'),
      session('old-paused', 'paused', '2026-04-01T00:00:00.000Z'),
      session('old-finished', 'finished', '2026-04-01T00:00:00.000Z'),
      session('recent-error', 'error', '2026-06-10T00:00:00.000Z'),
    ]);

    expect((await loadSessions<StoreSession>('profile-a')).map((item) => item.id)).toEqual([
      'recent-error',
      'old-ready',
      'old-running',
      'old-paused',
    ]);
  });

  it('expires local tombstones after 30 days', async () => {
    await saveDeletedSessionIds('profile-a', new Set(['deleted-session']), Date.parse('2026-05-01T00:00:00.000Z'));

    expect([...(await loadDeletedSessionIds('profile-a', Date.parse('2026-05-20T00:00:00.000Z')))]).toEqual([
      'deleted-session',
    ]);
    expect([...(await loadDeletedSessionIds('profile-a', nowMs))]).toEqual([]);
  });
});

function session(id: string, status: string, updatedAt: string): StoreSession {
  return {
    id,
    status,
    createdAt: updatedAt,
    updatedAt,
    telemetry: {
      startedAt: updatedAt,
      finishedAt: status === 'finished' || status === 'error' ? updatedAt : undefined,
      lagSeries: [],
      wpmSeries: [],
      accuracySeries: [],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    },
  };
}
