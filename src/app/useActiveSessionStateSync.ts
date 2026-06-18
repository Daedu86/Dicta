import { useEffect, useRef } from 'react';
import {
  hydrateActiveSessionState,
  persistActiveSessionState,
  syncFinishedActiveSessionState,
} from './activeSessionStateSyncActions';
import type { UseActiveSessionStateSyncParams } from './activeSessionStateSyncTypes';

export type { UseActiveSessionStateSyncParams } from './activeSessionStateSyncTypes';

export const ACTIVE_SESSION_LIVE_PERSIST_DELAY_MS = 3000;
export const ACTIVE_SESSION_LIVE_PERSIST_MAX_DELAY_MS = 10000;

export function shouldDebounceActiveSessionStatePersist({
  activeSession,
  sessionStatus,
  running,
}: Pick<UseActiveSessionStateSyncParams, 'activeSession' | 'sessionStatus' | 'running'>): boolean {
  return Boolean(activeSession && activeSession.status !== 'finished' && sessionStatus === 'running' && running);
}

export function useActiveSessionStateSync(params: UseActiveSessionStateSyncParams): void {
  const latestParamsRef = useRef(params);
  const persistDelayTimerRef = useRef<number | null>(null);
  const persistMaxDelayTimerRef = useRef<number | null>(null);

  latestParamsRef.current = params;

  function clearScheduledPersist(): void {
    if (persistDelayTimerRef.current !== null) {
      window.clearTimeout(persistDelayTimerRef.current);
      persistDelayTimerRef.current = null;
    }
    if (persistMaxDelayTimerRef.current !== null) {
      window.clearTimeout(persistMaxDelayTimerRef.current);
      persistMaxDelayTimerRef.current = null;
    }
  }

  function flushScheduledPersist(): void {
    clearScheduledPersist();
    persistActiveSessionState(latestParamsRef.current);
  }

  useEffect(() => {
    clearScheduledPersist();
    hydrateActiveSessionState(params);
  }, [params.activeSessionId]);

  useEffect(() => {
    syncFinishedActiveSessionState(params);
  }, [params.activeSession, params.sessionStatus, params.sessions]);

  useEffect(() => {
    if (!shouldDebounceActiveSessionStatePersist(params)) {
      flushScheduledPersist();
      return;
    }

    if (persistDelayTimerRef.current !== null) {
      window.clearTimeout(persistDelayTimerRef.current);
    }
    persistDelayTimerRef.current = window.setTimeout(() => {
      flushScheduledPersist();
    }, ACTIVE_SESSION_LIVE_PERSIST_DELAY_MS);

    if (persistMaxDelayTimerRef.current !== null) return;
    persistMaxDelayTimerRef.current = window.setTimeout(() => {
      flushScheduledPersist();
    }, ACTIVE_SESSION_LIVE_PERSIST_MAX_DELAY_MS);
  }, [
    params.activeSession,
    params.difficulty,
    params.inputSettingsLocked,
    params.lagSec,
    params.lagWords,
    params.rate,
    params.ttsText,
    params.ttsLanguage,
    params.ttsPracticeText,
    params.trend,
    params.accuracy,
    params.activePoints,
    params.activeVisibleAccuracy,
    params.activeVisibleScore,
    params.sessionStatus,
    params.controllerState,
    params.running,
    params.wpm,
  ]);

  useEffect(() => () => {
    flushScheduledPersist();
  }, []);
}
