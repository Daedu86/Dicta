import { describe, expect, it } from 'vitest';

import { selectPushableSyncRows } from '../../src/core/supabaseSync';
import { feedbackRow, sessionRow, syncRows } from './pushableRowsFixtures';

describe('supabaseSync pushable rows stale pending protection', () => {
  it('does not push a stale local pending session over a submitted remote session', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'desktop-pending',
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-02T10:00:00.000Z',
        status: 'finished',
        marker: 'phone-submitted',
        payload: { telemetry: { actions: [{ action: 'submit' }] } },
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over completed remote feedback', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:10:00.000Z',
        marker: 'local-pending',
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'remote-pending',
      }),
      feedbackRow({
        updatedAt: '2026-05-03T10:08:00.000Z',
        completedAt: '2026-05-03T10:08:00.000Z',
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over a finalized remote session without submit action', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'phone-pending',
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-02T10:00:00.000Z',
        status: 'finished',
        marker: 'desktop-finalized',
        payload: {
          telemetry: {
            finishedAt: '2026-05-02T10:00:00.000Z',
            actions: [],
          },
        },
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over a finished remote TTS session with missing telemetry markers', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'desktop-pending',
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-02T10:00:00.000Z',
        status: 'finished',
        marker: 'mobile-submitted-no-marker',
        payload: {
          ttsText: 'Bonjour tout le monde',
          ttsPracticeText: 'Bonjour tout le monde',
          metrics: { wpm: 38, points: 0, score: 0 },
          telemetry: { actions: [] },
        },
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a stale local pending session over a finished remote TTS session with score signals but empty practice text', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'desktop-pending',
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-02T10:00:00.000Z',
        status: 'finished',
        marker: 'mobile-finished-score-signals',
        payload: {
          ttsText: 'Alltägliche Erlebnisse im Park',
          ttsPracticeText: '',
          metrics: { points: 78, score: 297, wpm: 31.2 },
          telemetry: { actions: [] },
        },
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });
});
