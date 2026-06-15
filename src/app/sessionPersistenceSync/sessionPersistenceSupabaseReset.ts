import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DictaSyncRow } from '../../core/supabaseSync';
import type { SupabaseInitialPullState, SupabaseSyncStatus } from './sessionPersistenceSyncTypes';

type UseSupabaseSyncIdentityResetOptions = {
  syncEnabled: boolean;
  profileId: string;
  supabaseSyncIdentity: string;
  authRequired: boolean;
  profileDisplayName?: string | null;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  setSupabaseInitialPullState: Dispatch<SetStateAction<SupabaseInitialPullState>>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  supabaseLastFullPullAtMsRef: MutableRefObject<number>;
  pendingCriticalSessionRowsRef: MutableRefObject<DictaSyncRow[]>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
};

export function useSupabaseSyncIdentityReset({
  syncEnabled,
  profileId,
  supabaseSyncIdentity,
  authRequired,
  profileDisplayName,
  supabaseInitialPullCompleteRef,
  setSupabaseInitialPullState,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  supabaseLastFullPullAtMsRef,
  pendingCriticalSessionRowsRef,
  setSupabaseSyncStatus,
}: UseSupabaseSyncIdentityResetOptions): void {
  useEffect(() => {
    supabaseInitialPullCompleteRef.current = !syncEnabled;
    setSupabaseInitialPullState({
      key: supabaseSyncIdentity,
      complete: !syncEnabled,
    });
    supabaseKnownRemoteRowsRef.current = [];
    supabaseLastRemoteUpdatedAtRef.current = null;
    supabaseLastFullPullAtMsRef.current = 0;
    pendingCriticalSessionRowsRef.current = [];
    setSupabaseSyncStatus({
      enabled: syncEnabled,
      state: syncEnabled ? 'idle' : 'disabled',
      message: syncEnabled
        ? `Supabase sync ready for ${profileDisplayName ?? profileId}.`
        : authRequired
          ? 'Sign in with Supabase Auth to enable cross-device sync.'
          : 'Set Supabase env vars to enable cross-device sync.',
      lastSyncedAt: null,
      imported: 0,
      pushed: 0,
    });
  }, [
    authRequired,
    pendingCriticalSessionRowsRef,
    profileDisplayName,
    profileId,
    setSupabaseInitialPullState,
    setSupabaseSyncStatus,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastFullPullAtMsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabaseSyncIdentity,
    syncEnabled,
  ]);
}
