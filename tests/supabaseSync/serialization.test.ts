import { describe, expect, it } from 'vitest';

import { buildSyncItems, toSyncRows } from '../../src/core/supabaseSync';
import { baseState } from './fixtures';

describe('supabaseSync serialization', () => {
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
});
