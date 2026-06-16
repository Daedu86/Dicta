import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { cloneTelemetry } from '../core/sessionNormalization';
import { telemetryEquals } from '../core/sessionTelemetryEquality';
import { normalizeLiveSessionStatusForPersistence } from '../core/sessionStatusNormalization';
import { buildTrainingSubmitMessage } from '../core/trainingSubmitMessage';
import { buildActiveSessionHydrationState } from './activeSessionHydration';
import type { StoredSession } from './sessionTypes';
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

function resetActiveSessionRuntimeRefs({
  previousLagRef,
  previousAccuracyRef,
  ttsStartedAtMsRef,
  ttsChunkStartMsRef,
  ttsChunkStartWordIndexRef,
  ttsChunkWordCountRef,
  ttsCompletedSourceWordsRef,
  ttsLagOutlierCountRef,
  ttsUnsafeChunkCountRef,
  ttsChunkAccuracyWindowRef,
  ttsLastAccuracySnapshotRef,
  ttsLastControllerActionRef,
}: UseActiveSessionStateSyncParams): void {
  previousLagRef.current = 0;
  previousAccuracyRef.current = 100;
  ttsStartedAtMsRef.current = null;
  ttsChunkStartMsRef.current = null;
  ttsChunkStartWordIndexRef.current = 0;
  ttsChunkWordCountRef.current = 0;
  ttsCompletedSourceWordsRef.current = 0;
  ttsLagOutlierCountRef.current = 0;
  ttsUnsafeChunkCountRef.current = 0;
  ttsChunkAccuracyWindowRef.current = [];
  ttsLastAccuracySnapshotRef.current = { typedWords: 0, matchedWords: 0 };
  ttsLastControllerActionRef.current = 'hold';
}

function buildPersistedActiveSession(session: StoredSession, params: UseActiveSessionStateSyncParams): StoredSession {
  const { activeSession } = params;
  if (!activeSession || session.id !== activeSession.id) return session;

  const nextTelemetry = cloneTelemetry(params.telemetryRef.current);
  const nextStatus = normalizeLiveSessionStatusForPersistence(params.sessionStatus, nextTelemetry, params.running);
  const isExplicitFinishedReset = params.allowFinishedSessionResetRef.current === session.id && nextStatus !== 'finished';

  if (session.status === 'finished' && nextStatus !== 'finished' && !isExplicitFinishedReset) {
    return session;
  }
  if (isExplicitFinishedReset) {
    params.allowFinishedSessionResetRef.current = null;
  }
  if (session.status === 'finished' && nextStatus === 'finished') {
    return session;
  }

  if (!hasActiveSessionStateChanged(session, nextTelemetry, nextStatus, params)) {
    return session;
  }

  return {
    ...session,
    inputSettingsLocked: params.inputSettingsLocked,
    ttsText: params.ttsText,
    ttsLanguage: params.ttsLanguage,
    ttsPracticeText: params.ttsPracticeText,
    difficulty: params.difficulty,
    status: nextStatus,
    metrics: {
      controllerState: params.controllerState,
      rate: params.rate,
      lagSec: params.lagSec,
      lagWords: params.lagWords,
      wpm: params.wpm,
      accuracy: params.activeVisibleAccuracy,
      trend: params.trend,
      score: params.activeVisibleScore,
      points: params.activePoints,
    },
    telemetry: nextTelemetry,
    updatedAt: new Date().toISOString(),
  };
}

function hasActiveSessionStateChanged(
  session: StoredSession,
  nextTelemetry: StoredSession['telemetry'],
  nextStatus: StoredSession['status'],
  params: UseActiveSessionStateSyncParams,
): boolean {
  return (
    session.inputSettingsLocked !== params.inputSettingsLocked ||
    session.ttsText !== params.ttsText ||
    session.ttsLanguage !== params.ttsLanguage ||
    session.ttsPracticeText !== params.ttsPracticeText ||
    session.difficulty !== params.difficulty ||
    session.status !== nextStatus ||
    session.metrics.controllerState !== params.controllerState ||
    session.metrics.rate !== params.rate ||
    session.metrics.lagSec !== params.lagSec ||
    session.metrics.lagWords !== params.lagWords ||
    session.metrics.wpm !== params.wpm ||
    session.metrics.accuracy !== params.activeVisibleAccuracy ||
    session.metrics.trend !== params.trend ||
    session.metrics.score !== params.activeVisibleScore ||
    session.metrics.points !== params.activePoints ||
    !telemetryEquals(session.telemetry, nextTelemetry)
  );
}
