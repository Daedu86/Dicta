import { describe, expect, it } from 'vitest';

import { selectPushableSyncRows } from '../../src/core/supabaseSync';
import { feedbackRow, sessionRow, syncRows } from './pushableRowsFixtures';

describe('supabaseSync pushable row repairs', () => {
  it('allows a repaired local finished session to replace a remote pending session with completed feedback', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:08:00.000Z',
        status: 'finished',
        marker: 'local-repaired',
        payload: { telemetry: { finishedAt: '2026-05-03T10:08:00.000Z', actions: [] } },
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:10:00.000Z',
        marker: 'remote-pending',
      }),
      feedbackRow({
        updatedAt: '2026-05-03T10:08:00.000Z',
        completedAt: '2026-05-03T10:08:00.000Z',
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toHaveLength(1);
  });

  it('allows a submitted local phone session to repair a newer remote pending copy', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-02T10:00:00.000Z',
        status: 'finished',
        marker: 'phone-submitted',
        payload: { telemetry: { actions: [{ action: 'submit' }] } },
      }),
    );
    const remoteRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'desktop-pending',
      }),
    );

    expect(selectPushableSyncRows(localRows, remoteRows)).toHaveLength(1);
  });
});
