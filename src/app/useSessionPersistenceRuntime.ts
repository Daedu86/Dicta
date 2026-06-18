import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../components/openrouter/types';
import { getDictaSessionQuotaStatus } from '../core/appProfiles';
import { normalizeSessionForPersistence } from '../core/sessionNormalization';
import type { DictaSyncConfig } from '../core/supabaseSync';
import { buildCurrentSyncState } from './adminStorageSummary';
import { pruneAdaptiveSessionFeedbackBySessionIds } from './adaptiveSessionFeedbackRetention';
import {
  loadAdaptiveBenchmarks,
  loadAdaptiveSessionFeedback,
} from './adaptiveStorage';
import type { StoredSession } from './sessionTypes';
import {
  loadSessions,
  normalizeRestoredStoredSession,
} from './sessionStorage';
import { createIndexedDbLocalPayloadStore } from './sessionPersistenceSync/sessionPersistenceLocalPayloadStore';
import { useSessionPersistenceSync } from './useSessionPersistenceSync';
import { useSessionQuotaActions } from './useSessionQuotaActions';

type SessionQuotaActionOptions = Parameters<typeof useSessionQuotaActions>[0];

type UseSessionPersistenceRuntimeOptions = {
  sessions: StoredSession[];
  setSessions: Dispatch<SetStateAction<StoredSession[]>>;
  activeSessionId: string;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  syncConfig: DictaSyncConfig;
  supabaseClient: SupabaseClient | null;
  effectiveProfileId: string;
  appProfile: Parameters<typeof getDictaSessionQuotaStatus>[0];
  adaptiveBenchmarks: AdaptiveBenchmarksByInputLanguage;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<AdaptiveBenchmarksByInputLanguage>>;
  adaptiveBenchmarksRef: MutableRefObject<AdaptiveBenchmarksByInputLanguage>;
  adaptiveSessionFeedback: AdaptiveSessionFeedbackByInputLanguage;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<AdaptiveSessionFeedbackByInputLanguage>>;
  adaptiveSessionFeedbackRef: MutableRefObject<AdaptiveSessionFeedbackByInputLanguage>;
  setError: SessionQuotaActionOptions['setError'];
  setOpenRouterError: SessionQuotaActionOptions['setOpenRouterError'];
  setExportMessage: SessionQuotaActionOptions['setExportMessage'];
  clearDashboardSession: () => void;
  resetOpenRouterJobsRuntime: () => void;
};

export function useSessionPersistenceRuntime({
  sessions,
  setSessions,
  activeSessionId,
  setActiveSessionId,
  syncConfig,
  supabaseClient,
  effectiveProfileId,
  appProfile,
  adaptiveBenchmarks,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedback,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  setError,
  setOpenRouterError,
  setExportMessage,
  clearDashboardSession,
  resetOpenRouterJobsRuntime,
}: UseSessionPersistenceRuntimeOptions) {
  const localPayloadStore = useMemo(
    () => createIndexedDbLocalPayloadStore<
      StoredSession,
      AdaptiveBenchmarksByInputLanguage,
      AdaptiveSessionFeedbackByInputLanguage
    >(),
    [],
  );

  const persistenceRuntime = useSessionPersistenceSync<
    StoredSession,
    AdaptiveBenchmarksByInputLanguage,
    AdaptiveSessionFeedbackByInputLanguage
  >({
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    syncConfig,
    supabaseClient,
    effectiveProfileId,
    profileDisplayName: appProfile?.displayName,
    adaptiveBenchmarks,
    setAdaptiveBenchmarks,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback,
    setAdaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    loadSessions,
    loadAdaptiveBenchmarks,
    loadAdaptiveSessionFeedback,
    localPayloadStore,
    normalizeSessionForPersistence,
    normalizeRestoredSession: normalizeRestoredStoredSession,
    buildSyncState: buildCurrentSyncState,
    pruneAdaptiveSessionFeedbackForDeletedSessions: pruneAdaptiveSessionFeedbackBySessionIds,
    onQuotaRecovered: setError,
    onProfileStorageSwitched: () => {
      clearDashboardSession();
      resetOpenRouterJobsRuntime();
    },
  });

  const sessionQuotaStatus = getDictaSessionQuotaStatus(
    syncConfig.authRequired ? appProfile : null,
    sessions.length,
  );

  const quotaActions = useSessionQuotaActions({
    sessionQuotaStatus,
    setError,
    setOpenRouterError,
    setExportMessage,
  });

  return {
    ...persistenceRuntime,
    sessionQuotaStatus,
    ...quotaActions,
  };
}
