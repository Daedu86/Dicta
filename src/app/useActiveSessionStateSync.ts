import { useEffect } from 'react';
import {
  hydrateActiveSessionState,
  persistActiveSessionState,
  syncFinishedActiveSessionState,
} from './activeSessionStateSyncActions';
import type { UseActiveSessionStateSyncParams } from './activeSessionStateSyncTypes';

export function useActiveSessionStateSync(params: UseActiveSessionStateSyncParams): void {
  useEffect(() => {
    hydrateActiveSessionState(params);
  }, [params.activeSessionId]);

  useEffect(() => {
    syncFinishedActiveSessionState(params);
  }, [params.activeSession, params.sessionStatus, params.sessions]);

  useEffect(() => {
    persistActiveSessionState(params);
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
}
