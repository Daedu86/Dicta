import { describe, expect, it } from 'vitest';
import {
  SUPABASE_KEEPALIVE_BODY_MAX_BYTES,
  buildPendingCriticalSessionRowsKeepalivePlan,
} from '../src/app/sessionPersistenceKeepalivePlan';
import type { DictaSyncRow } from '../src/core/supabaseSync';

function row(overrides: Partial<DictaSyncRow> = {}): DictaSyncRow {
  return {
    profile_id: 'profile-1',
    item_type: 'session',
    item_key: 'session-1',
    payload: { id: 'session-1', updatedAt: '2026-06-15T10:00:00.000Z' },
    updated_at: '2026-06-15T10:00:00.000Z',
    ...overrides,
  };
}

const enabledSyncConfig = {
  enabled: true,
  url: 'https://example.supabase.co///',
  anonKey: 'anon-key',
};

describe('sessionPersistenceKeepalivePlan', () => {
  it('returns no plan when sync is disabled or required inputs are missing', () => {
    expect(buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: { ...enabledSyncConfig, enabled: false },
      accessToken: 'token',
      pendingRows: [row()],
      knownRemoteRows: [],
    })).toEqual({ plan: null, clearPendingRows: false });

    expect(buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: enabledSyncConfig,
      accessToken: '',
      pendingRows: [row()],
      knownRemoteRows: [],
    })).toEqual({ plan: null, clearPendingRows: false });

    expect(buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: enabledSyncConfig,
      accessToken: 'token',
      pendingRows: [],
      knownRemoteRows: [],
    })).toEqual({ plan: null, clearPendingRows: false });
  });

  it('clears pending rows when none are pushable', () => {
    const pendingRow = row();

    expect(buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: enabledSyncConfig,
      accessToken: 'token',
      pendingRows: [pendingRow],
      knownRemoteRows: [pendingRow],
    })).toEqual({ plan: null, clearPendingRows: true });
  });

  it('builds a keepalive request for pushable rows', () => {
    const result = buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: enabledSyncConfig,
      accessToken: 'access-token',
      pendingRows: [row({ item_key: 'session-2', updated_at: '2026-06-15T10:01:00.000Z' })],
      knownRemoteRows: [],
    });

    expect(result.clearPendingRows).toBe(false);
    expect(result.plan).toMatchObject({
      endpoint: 'https://example.supabase.co/rest/v1/dicta_sync_items?on_conflict=profile_id,item_type,item_key',
      headers: {
        apikey: 'anon-key',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    });
    expect(result.plan?.rows).toHaveLength(1);
    expect(JSON.parse(result.plan?.body ?? '[]')).toMatchObject([
      { item_type: 'session', item_key: 'session-2' },
    ]);
  });

  it('skips oversized keepalive bodies without clearing pending rows', () => {
    const largePayload = 'x'.repeat(SUPABASE_KEEPALIVE_BODY_MAX_BYTES + 1);

    expect(buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: enabledSyncConfig,
      accessToken: 'token',
      pendingRows: [row({ payload: { id: 'session-large', updatedAt: '2026-06-15T10:00:00.000Z', largePayload } })],
      knownRemoteRows: [],
    })).toEqual({ plan: null, clearPendingRows: false });
  });
});
