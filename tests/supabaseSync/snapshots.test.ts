import { describe, expect, it } from 'vitest';

import { buildSyncItems, latestSyncRowTimestamp, mergeSyncRowSnapshots, mergeSyncRows, toSyncRows } from '../../src/core/supabaseSync';
import { baseState } from './fixtures';

describe('supabaseSync snapshots', () => {
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
