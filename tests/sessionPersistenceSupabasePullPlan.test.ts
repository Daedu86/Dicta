import { describe, expect, it } from 'vitest';
import {
  SUPABASE_FULL_PULL_INTERVAL_MS,
  collectTransientErrorSessionIds,
  shouldUseFullSupabasePull,
} from '../src/app/sessionPersistenceSupabasePullPlan';
import type { DictaSyncRow } from '../src/core/supabaseSync';

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

describe('sessionPersistenceSupabasePullPlan', () => {
  it('uses a full pull for initial sync', () => {
    expect(shouldUseFullSupabasePull('initial', 1_000, 999)).toBe(true);
  });

  it('uses incremental background pulls until the full-pull interval expires', () => {
    expect(shouldUseFullSupabasePull('background', SUPABASE_FULL_PULL_INTERVAL_MS, 1)).toBe(false);
    expect(shouldUseFullSupabasePull('background', SUPABASE_FULL_PULL_INTERVAL_MS + 2, 1)).toBe(true);
  });

  it('collects transient error session ids only from session rows', () => {
    const ids = collectTransientErrorSessionIds([
      row({
        item_key: 'transient-1',
        payload: {
          id: 'transient-1',
          status: 'error',
          name: 'OpenRouter generation error',
          generationError: 'Failed to reach OpenRouter endpoint.',
        },
      }),
      row({ item_type: 'feedback', item_key: 'feedback-1', payload: { id: 'feedback-1', status: 'error' } }),
      row({ item_key: 'finished-1', payload: { id: 'finished-1', status: 'finished' } }),
    ]);

    expect(ids).toEqual(['transient-1']);
  });
});
