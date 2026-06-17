import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { cloneTelemetry } from '../core/sessionNormalization';
import { buildTrainingSubmitMessage } from '../core/trainingSubmitMessage';
import { buildActiveSessionHydrationState } from './activeSessionHydration';
import {
  buildPersistedActiveSession,
  resetActiveSessionRuntimeRefs,
} from './activeSessionPersistenceState';
import type { UseActiveSessionStateSyncParams } from './activeSessionStateSyncTypes';

export function hydrateActiveSessionState(params: UseActiveSessionStateSyncParams): void {
  const { activeSession } = params;
  if (!activeSession) return;

  const hydrationState = buildActiveSessionHydrationState(activeSession);
  params.hydratingSessionIdRef.current = activeSession.id;
  params.setDifficulty(hydrationState.difficulty);
  params.setInputSettingsLocked(hydrationState.inputSettingsLocked);
  params.setTtsLanguage(hydrationState.ttsLanguage);
  params.setTtsPracticeText(hydrationState.ttsPracticeText);
  params.ttsPracticeLiveTextRef.current = hydrationState.ttsPracticeText;
  params.setSessionStatus(hydrationState.sessionStatus);
  params.setTtsText(hydrationState.ttsText);
  params.setTtsStatus(hydrationState.ttsStatus);
  params.setTtsCurrentChunk(hydrationState.ttsCurrentChunk);
  params.setTtsPacingMode(hydrationState.ttsPacingMode);
  params.setTtsSpeechRate(hydrationState.ttsSpeechRate);
  params.setRunning(hydrationState.running);
  params.setRate(hydrationState.rate);
  params.setLagSec(hydrationState.lagSec);
  params.setLagWords(hydrationState.lagWords);
  params.setWpm(hydrationState.wpm);
  params.setAccuracy(hydrationState.accuracy);
  params.setTrend(hydrationState.trend);
  params.setControllerState(hydrationState.controllerState);
  params.ttsUiLastPublishedAtRef.current = 0;
  params.ttsPublishedUiRef.current = hydrationState.publishedUi;
  params.telemetryRef.current = cloneTelemetry(activeSession.telemetry);
  params.setExportMessage('');
  params.setError('');
  params.setTrainingSubmitMessage(activeSession.status === 'finished' ? buildTrainingSubmitMessage(params.sessions, activeSession.id) : '');
  resetActiveSessionRuntimeRefs(params);
  params.resetAdaptiveSessionFeedbackTracking(params.activeSessionId);
}

export function syncFinishedActiveSessionState(params: UseActiveSessionStateSyncParams): void {
  const { activeSession } = params;
  if (!activeSession || activeSession.status !== 'finished' || params.sessionStatus === 'finished') return;

  params.setRunning(false);
  params.setSessionStatus('finished');
  if (activeSession.inputMode === BROWSER_TTS_SESSION_INPUT_MODE) {
    params.setTtsStatus('finished');
  }
  params.setControllerState(activeSession.metrics.controllerState);
  params.setRate(activeSession.metrics.rate);
  params.setLagSec(activeSession.metrics.lagSec);
  params.setLagWords(activeSession.metrics.lagWords);
  params.setWpm(activeSession.metrics.wpm);
  params.setAccuracy(activeSession.metrics.accuracy);
  params.setTrend(activeSession.metrics.trend);
  params.telemetryRef.current = cloneTelemetry(activeSession.telemetry);
  params.setError('');
  params.setTrainingSubmitMessage(buildTrainingSubmitMessage(params.sessions, activeSession.id));
}

export function persistActiveSessionState(params: UseActiveSessionStateSyncParams): void {
  const { activeSession } = params;
  if (!activeSession) return;
  if (params.hydratingSessionIdRef.current === activeSession.id) {
    params.hydratingSessionIdRef.current = null;
    return;
  }

  params.setSessions((prev) => prev.map((session) => buildPersistedActiveSession(session, params)));
}
