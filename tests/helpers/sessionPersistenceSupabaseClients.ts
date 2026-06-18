import type { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';
import type { DictaSyncRow } from '../../src/core/supabaseSync';

export function createDeferredSupabaseClient(remoteRows: DictaSyncRow[]): {
  client: SupabaseClient;
  resolvePull: () => void;
  upsert: ReturnType<typeof vi.fn>;
} {
  let resolvePull: (value: { data: DictaSyncRow[]; error: null }) => void = () => undefined;
  const pullResult = new Promise<{ data: DictaSyncRow[]; error: null }>((resolve) => {
    resolvePull = resolve;
  });
  const upsert = vi.fn(async () => ({ error: null }));
  const query = {
    select: () => query,
    eq: () => query,
    gt: () => query,
    order: () => query,
    range: () => pullResult,
    upsert,
  };
  return {
    client: {
      from: () => query,
    } as unknown as SupabaseClient,
    resolvePull: () => resolvePull({ data: remoteRows, error: null }),
    upsert,
  };
}

export function createKeepaliveSupabaseClient(): SupabaseClient {
  const pullResult = Promise.resolve<{ data: DictaSyncRow[]; error: null }>({ data: [], error: null });
  const query = {
    select: () => query,
    eq: () => query,
    gt: () => query,
    order: () => query,
    range: () => pullResult,
    upsert: () => new Promise<{ error: null }>(() => undefined),
  };
  return {
    from: () => query,
    auth: {
      getSession: async () => ({
        data: {
          session: {
            access_token: 'access-token',
          },
        },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
  } as unknown as SupabaseClient;
}
