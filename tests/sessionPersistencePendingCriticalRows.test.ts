import { describe, expect, it } from 'vitest';
import {
  clearPendingCriticalSessionRowsSnapshot,
  rememberPendingCriticalSessionRowsSnapshot,
} from '../src/app/sessionPersistencePendingCriticalRows';
import type { DictaSyncRow, DictaSyncState } from '../src/core/supabaseSync';

function row(overrides: Partial<DictaSyncRow>): DictaSyncRow {
  return {
    profile_id: 'profile-1',
    item_type: 'session',
    item_key: 'session-1',
    payload: { id: 'session-1' },
    updated_at: '2026-06-15T10:00:00.000Z',
    ...overrides,
  };
}

function syncState(): DictaSyncState {
  return {
    sessions: [
      { id: 'session-1', updatedAt: '2026-06-15T10:00:01.000Z', marker: 'one' },
      { id: 'session-2', updatedAt: '2026-06-15T10:00:02.000Z', marker: 'two' },
      { id: '', updatedAt: '2026-06-15T10:00:03.000Z', marker: 'invalid' },
    ],
    benchmarks: {},
    feedback: {},
  };
}

describe('sessionPersistencePendingCriticalRows', () => {
  it('clears only matching pending session rows', () => {
    const pendingRows = [
      row({ item_key: 'session-1' }),
      row({ item_key: 'session-2' }),
      row({ item_type: 'benchmark', item_key: 'session-1' }),
    ];

    expect(clearPendingCriticalSessionRowsSnapshot(pendingRows, ['session-1'])).toEqual([
      pendingRows[1],
      pendingRows[2],
    ]);
  });

  it('returns the existing rows when disabled or session ids are empty', () => {
    const existingRows = [row({ item_key: 'session-existing' })];

    expect(rememberPendingCriticalSessionRowsSnapshot({
      enabled: false,
      profileId: 'profile-1',
      existingRows,
      syncState: syncState(),
      sessionIds: ['session-1'],
    })).toBe(existingRows);

    expect(rememberPendingCriticalSessionRowsSnapshot({
      enabled: true,
      profileId: 'profile-1',
      existingRows,
      syncState: syncState(),
      sessionIds: [],
    })).toBe(existingRows);
  });

  it('adds only requested session rows from the sync state', () => {
    const rememberedRows = rememberPendingCriticalSessionRowsSnapshot({
      enabled: true,
      profileId: 'profile-1',
      existingRows: [],
      syncState: syncState(),
      sessionIds: ['session-2', '', 'missing-session'],
    });

    expect(rememberedRows).toHaveLength(1);
    expect(rememberedRows[0]).toMatchObject({
      profile_id: 'profile-1',
      item_type: 'session',
      item_key: 'session-2',
      payload: { id: 'session-2', marker: 'two' },
      updated_at: '2026-06-15T10:00:02.000Z',
    });
  });

  it('merges remembered rows with existing pending rows', () => {
    const existingRows = [row({ item_key: 'session-1', updated_at: '2026-06-15T09:00:00.000Z' })];

    const rememberedRows = rememberPendingCriticalSessionRowsSnapshot({
      enabled: true,
      profileId: 'profile-1',
      existingRows,
      syncState: syncState(),
      sessionIds: ['session-1', 'session-2'],
    });

    expect(rememberedRows.map((pendingRow) => pendingRow.item_key).sort()).toEqual(['session-1', 'session-2']);
    expect(rememberedRows.find((pendingRow) => pendingRow.item_key === 'session-1')?.updated_at).toBe('2026-06-15T10:00:01.000Z');
  });
});
