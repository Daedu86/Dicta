import { cloneTelemetry } from '../core/sessionNormalization';
import { telemetryEquals } from '../core/sessionTelemetryEquality';
import { normalizeLiveSessionStatusForPersistence } from '../core/sessionStatusNormalization';
import type { StoredSession } from './sessionTypes';
import type { UseActiveSessionStateSyncParams } from './activeSessionStateSyncTypes';

export function resetActiveSessionRuntimeRefs({
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

export function buildPersistedActiveSession(session: StoredSession, params: UseActiveSessionStateSyncParams): StoredSession {
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
