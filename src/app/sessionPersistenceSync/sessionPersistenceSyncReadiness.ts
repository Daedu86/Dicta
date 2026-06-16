import type { DictaSyncConfig } from '../../core/supabaseSync';
import type { SupabaseInitialPullState, SupabaseSyncStatus } from './sessionPersistenceSyncTypes';

export function isLocalStorageReadyForEffectiveProfile(
  syncConfig: DictaSyncConfig,
  effectiveProfileId: string,
  activeLocalSyncProfileId: string,
): boolean {
  return !syncConfig.authRequired || !effectiveProfileId || activeLocalSyncProfileId === effectiveProfileId;
}

export function buildEffectiveSyncConfig(
  syncConfig: DictaSyncConfig,
  effectiveProfileId: string,
  localStorageReadyForEffectiveProfile: boolean,
): DictaSyncConfig {
  return {
    ...syncConfig,
    enabled: Boolean(syncConfig.url && syncConfig.anonKey && effectiveProfileId && localStorageReadyForEffectiveProfile),
    profileId: effectiveProfileId,
  };
}

export function createSupabaseSyncStatus(syncEnabled: boolean): SupabaseSyncStatus {
  return {
    enabled: syncEnabled,
    state: syncEnabled ? 'idle' : 'disabled',
    message: syncEnabled ? 'Supabase sync ready.' : 'Sign in with Supabase Auth to enable cross-device sync.',
    lastSyncedAt: null,
    imported: 0,
    pushed: 0,
  };
}

export function createSupabaseInitialPullState(
  supabaseSyncIdentity: string,
  syncEnabled: boolean,
): SupabaseInitialPullState {
  return {
    key: supabaseSyncIdentity,
    complete: !syncEnabled,
  };
}

export function isSupabaseInitialSyncComplete(
  syncEnabled: boolean,
  supabaseInitialPullState: SupabaseInitialPullState,
  supabaseSyncIdentity: string,
): boolean {
  return !syncEnabled || (supabaseInitialPullState.key === supabaseSyncIdentity && supabaseInitialPullState.complete);
}
