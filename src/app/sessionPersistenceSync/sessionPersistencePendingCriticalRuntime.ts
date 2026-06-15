import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { DictaSyncConfig, DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import { buildPendingCriticalSessionRowsKeepalivePlan } from '../sessionPersistenceKeepalivePlan';
import {
  clearPendingCriticalSessionRowsSnapshot,
  rememberPendingCriticalSessionRowsSnapshot,
} from '../sessionPersistencePendingCriticalRows';

export type PendingCriticalSessionRowsRuntime = {
  clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
  rememberPendingCriticalSessionRows: (syncState: DictaSyncState, sessionIds: string[]) => void;
  flushPendingCriticalSessionRowsKeepalive: () => void;
};

type UsePendingCriticalSessionRowsRuntimeOptions = {
  effectiveSyncConfig: DictaSyncConfig;
  supabaseAccessTokenRef: MutableRefObject<string>;
  pendingCriticalSessionRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
};

export function usePendingCriticalSessionRowsRuntime({
  effectiveSyncConfig,
  supabaseAccessTokenRef,
  pendingCriticalSessionRowsRef,
  supabaseKnownRemoteRowsRef,
}: UsePendingCriticalSessionRowsRuntimeOptions): PendingCriticalSessionRowsRuntime {
  const clearPendingCriticalSessionRows = useCallback((sessionIds: string[]): void => {
    pendingCriticalSessionRowsRef.current = clearPendingCriticalSessionRowsSnapshot(
      pendingCriticalSessionRowsRef.current,
      sessionIds,
    );
  }, [pendingCriticalSessionRowsRef]);

  const rememberPendingCriticalSessionRows = useCallback((syncState: DictaSyncState, sessionIds: string[]): void => {
    pendingCriticalSessionRowsRef.current = rememberPendingCriticalSessionRowsSnapshot({
      enabled: effectiveSyncConfig.enabled,
      profileId: effectiveSyncConfig.profileId,
      existingRows: pendingCriticalSessionRowsRef.current,
      syncState,
      sessionIds,
    });
  }, [effectiveSyncConfig.enabled, effectiveSyncConfig.profileId, pendingCriticalSessionRowsRef]);

  const flushPendingCriticalSessionRowsKeepalive = useCallback((): void => {
    const { plan, clearPendingRows } = buildPendingCriticalSessionRowsKeepalivePlan({
      syncConfig: {
        enabled: effectiveSyncConfig.enabled,
        url: effectiveSyncConfig.url,
        anonKey: effectiveSyncConfig.anonKey,
      },
      accessToken: supabaseAccessTokenRef.current,
      pendingRows: pendingCriticalSessionRowsRef.current,
      knownRemoteRows: supabaseKnownRemoteRowsRef.current,
    });
    if (clearPendingRows) {
      pendingCriticalSessionRowsRef.current = [];
    }
    if (!plan) return;

    try {
      void fetch(plan.endpoint, {
        method: 'POST',
        keepalive: true,
        headers: plan.headers,
        body: plan.body,
      });
    } catch {
      // The normal Supabase retry path will run on the next visible/online sync cycle.
    }
  }, [
    effectiveSyncConfig.anonKey,
    effectiveSyncConfig.enabled,
    effectiveSyncConfig.url,
    pendingCriticalSessionRowsRef,
    supabaseAccessTokenRef,
    supabaseKnownRemoteRowsRef,
  ]);

  return {
    clearPendingCriticalSessionRows,
    rememberPendingCriticalSessionRows,
    flushPendingCriticalSessionRowsKeepalive,
  };
}
