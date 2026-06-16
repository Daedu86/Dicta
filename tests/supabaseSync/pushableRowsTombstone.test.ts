import { describe, expect, it } from 'vitest';

import { selectPushableSyncRows } from '../../src/core/supabaseSync';
import { sessionRow, syncRows, tombstoneRow } from './pushableRowsFixtures';

describe('supabaseSync pushable tombstone rows', () => {
  it('does not push a stale submitted local session over a newer remote tombstone', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-02T10:00:00.000Z',
        status: 'finished',
        marker: 'phone-submitted',
        payload: { telemetry: { actions: [{ action: 'submit' }] } },
      }),
    );
    const remoteRows = syncRows(tombstoneRow({ updatedAt: '2026-05-03T10:00:00.000Z' }));

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('does not push a newer local pending session over an older remote tombstone', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        marker: 'desktop-pending',
      }),
    );
    const remoteRows = syncRows(tombstoneRow({ updatedAt: '2026-05-02T10:00:00.000Z' }));

    expect(selectPushableSyncRows(localRows, remoteRows)).toEqual([]);
  });

  it('allows a newer submitted local session to repair an older remote tombstone', () => {
    const localRows = syncRows(
      sessionRow({
        updatedAt: '2026-05-03T10:00:00.000Z',
        status: 'finished',
        marker: 'desktop-submitted',
        payload: { telemetry: { actions: [{ action: 'submit' }] } },
      }),
    );
    const remoteRows = syncRows(tombstoneRow({ updatedAt: '2026-05-02T10:00:00.000Z' }));

    expect(selectPushableSyncRows(localRows, remoteRows)).toHaveLength(1);
  });
});
