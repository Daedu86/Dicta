import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ControlAction, SessionTelemetry, TtsPacingMode } from '../types/dictation';
import type { Difficulty } from '../core/config';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { buildActiveSessionHydrationState } from './activeSessionHydration';
import { cloneTelemetry } from '../core/sessionNormalization';
import { telemetryEquals } from '../core/sessionTelemetryEquality';
import { normalizeLiveSessionStatusForPersistence } from '../core/sessionStatusNormalization';
import { buildTrainingSubmitMessage } from '../core/trainingSubmitMessage';
import type {
  PerformanceTrend,
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';

type TtsAccuracySnapshot = {
  typedWords: number;
  matchedWords: number;
};

type UseActiveSessionStateSyncParams = {
  sessions: StoredSession[];
  setSessions: Dispatch<SetStateAction<StoredSession[]>>;
  activeSession: StoredSession | null;
  activeSessionId: string;
  activeVisibleAccuracy: number;
  activeVisibleScore: number;
  activePoints: number;
  difficulty: Difficulty;
  inputSettingsLocked: boolean;
  ttsText: string;
  ttsLanguage: TtsLanguage;
  ttsPracticeText: string;
  sessionStatus: SessionStatus;
  controllerState: ControlAction;
  running: boolean;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: PerformanceTrend;
  hydratingSessionIdRef: MutableRefObject<string | null>;
  allowFinishedSessionResetRef: MutableRefObject<string | null>;
  ttsPracticeLiveTextRef: MutableRefObject<string>;
  ttsUiLastPublishedAtRef: MutableRefObject<number>;
  ttsPublishedUiRef: MutableRefObject<TtsPublishedUiState>;
  telemetryRef: MutableRefObject<SessionTelemetry | null>;
  previousLagRef: MutableRefObject<number>;
  previousAccuracyRef: MutableRefObject<number>;
  ttsStartedAtMsRef: MutableRefObject<number | null>;
  ttsChunkStartMsRef: MutableRefObject<number | null>;
  ttsChunkStartWordIndexRef: MutableRefObject<number>;
  ttsChunkWordCountRef: MutableRefObject<number>;
  ttsCompletedSourceWordsRef: MutableRefObject<number>;
  ttsLagOutlierCountRef: MutableRefObject<number>;
  ttsUnsafeChunkCountRef: MutableRefObject<number>;
  ttsChunkAccuracyWindowRef: MutableRefObject<number[]>;
  ttsLastAccuracySnapshotRef: MutableRefObject<TtsAccuracySnapshot>;
  ttsLastControllerActionRef: MutableRefObject<ControlAction>;
  setDifficulty: Dispatch<SetStateAction<Difficulty>>;
  setInputSettingsLocked: Dispatch<SetStateAction<boolean>>;
  setTtsLanguage: Dispatch<SetStateAction<TtsLanguage>>;
  setTtsPracticeText: Dispatch<SetStateAction<string>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus>>;
  setTtsText: Dispatch<SetStateAction<string>>;
  setTtsStatus: Dispatch<SetStateAction<TtsStatus>>;
  setTtsCurrentChunk: Dispatch<SetStateAction<string>>;
  setTtsPacingMode: Dispatch<SetStateAction<TtsPacingMode>>;
  setTtsSpeechRate: Dispatch<SetStateAction<number>>;
  setRunning: Dispatch<SetStateAction<boolean>>;
  setRate: Dispatch<SetStateAction<number>>;
  setLagSec: Dispatch<SetStateAction<number>>;
  setLagWords: Dispatch<SetStateAction<number>>;
  setWpm: Dispatch<SetStateAction<number>>;
  setAccuracy: Dispatch<SetStateAction<number>>;
  setTrend: Dispatch<SetStateAction<PerformanceTrend>>;
  setControllerState: Dispatch<SetStateAction<ControlAction>>;
  setExportMessage: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setTrainingSubmitMessage: Dispatch<SetStateAction<string>>;
  resetAdaptiveSessionFeedbackTracking: (sessionId: string | undefined) => void;
};

export function useActiveSessionStateSync({
  sessions,
  setSessions,
  activeSession,
  activeSessionId,
  activeVisibleAccuracy,
  activeVisibleScore,
  activePoints,
  difficulty,
  inputSettingsLocked,
  ttsText,
  ttsLanguage,
  ttsPracticeText,
  sessionStatus,
  controllerState,
  running,
  rate,
  lagSec,
  lagWords,
  wpm,
  accuracy,
  trend,
  hydratingSessionIdRef,
  allowFinishedSessionResetRef,
  ttsPracticeLiveTextRef,
  ttsUiLastPublishedAtRef,
  ttsPublishedUiRef,
  telemetryRef,
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
  setDifficulty,
  setInputSettingsLocked,
  setTtsLanguage,
  setTtsPracticeText,
  setSessionStatus,
  setTtsText,
  setTtsStatus,
  setTtsCurrentChunk,
  setTtsPacingMode,
  setTtsSpeechRate,
  setRunning,
  setRate,
  setLagSec,
  setLagWords,
  setWpm,
  setAccuracy,
  setTrend,
  setControllerState,
  setExportMessage,
  setError,
  setTrainingSubmitMessage,
  resetAdaptiveSessionFeedbackTracking,
}: UseActiveSessionStateSyncParams): void {
  useEffect(() => {
    if (!activeSession) return;

    hydratingSessionIdRef.current = activeSession.id;
    const hydrationState = buildActiveSessionHydrationState(activeSession);
    setDifficulty(hydrationState.difficulty);
    setInputSettingsLocked(hydrationState.inputSettingsLocked);
    setTtsLanguage(hydrationState.ttsLanguage);
    setTtsPracticeText(hydrationState.ttsPracticeText);
    ttsPracticeLiveTextRef.current = hydrationState.ttsPracticeText;
    setSessionStatus(hydrationState.sessionStatus);
    setTtsText(hydrationState.ttsText);
    setTtsStatus(hydrationState.ttsStatus);
    setTtsCurrentChunk(hydrationState.ttsCurrentChunk);
    setTtsPacingMode(hydrationState.ttsPacingMode);
    setTtsSpeechRate(hydrationState.ttsSpeechRate);
    setRunning(hydrationState.running);
    setRate(hydrationState.rate);
    setLagSec(hydrationState.lagSec);
    setLagWords(hydrationState.lagWords);
    setWpm(hydrationState.wpm);
    setAccuracy(hydrationState.accuracy);
    setTrend(hydrationState.trend);
    setControllerState(hydrationState.controllerState);
    ttsUiLastPublishedAtRef.current = 0;
    ttsPublishedUiRef.current = hydrationState.publishedUi;
    telemetryRef.current = cloneTelemetry(activeSession.telemetry);
    setExportMessage('');
    setError('');
    setTrainingSubmitMessage(activeSession.status === 'finished' ? buildTrainingSubmitMessage(sessions, activeSession.id) : '');
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
    resetAdaptiveSessionFeedbackTracking(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'finished' || sessionStatus === 'finished') return;

    setRunning(false);
    setSessionStatus('finished');
    if (activeSession.inputMode === BROWSER_TTS_SESSION_INPUT_MODE) {
      setTtsStatus('finished');
    }
    setControllerState(activeSession.metrics.controllerState);
    setRate(activeSession.metrics.rate);
    setLagSec(activeSession.metrics.lagSec);
    setLagWords(activeSession.metrics.lagWords);
    setWpm(activeSession.metrics.wpm);
    setAccuracy(activeSession.metrics.accuracy);
    setTrend(activeSession.metrics.trend);
    telemetryRef.current = cloneTelemetry(activeSession.telemetry);
    setError('');
    setTrainingSubmitMessage(buildTrainingSubmitMessage(sessions, activeSession.id));
  }, [activeSession, sessionStatus, sessions]);

  useEffect(() => {
    if (!activeSession) return;
    if (hydratingSessionIdRef.current === activeSession.id) {
      hydratingSessionIdRef.current = null;
      return;
    }

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }
        const nextTelemetry = cloneTelemetry(telemetryRef.current);
        const nextStatus = normalizeLiveSessionStatusForPersistence(sessionStatus, nextTelemetry, running);
        const isExplicitFinishedReset = allowFinishedSessionResetRef.current === session.id && nextStatus !== 'finished';
        // A remote sync import can mark the active session as finished before the visible
        // form state has hydrated. Do not let stale form state downgrade that result.
        if (session.status === 'finished' && nextStatus !== 'finished' && !isExplicitFinishedReset) {
          return session;
        }
        if (isExplicitFinishedReset) {
          allowFinishedSessionResetRef.current = null;
        }
        if (session.status === 'finished' && nextStatus === 'finished') {
          return session;
        }
        const changed =
          session.inputSettingsLocked !== inputSettingsLocked ||
          session.ttsText !== ttsText ||
          session.ttsLanguage !== ttsLanguage ||
          session.ttsPracticeText !== ttsPracticeText ||
          session.difficulty !== difficulty ||
          session.status !== nextStatus ||
          session.metrics.controllerState !== controllerState ||
          session.metrics.rate !== rate ||
          session.metrics.lagSec !== lagSec ||
          session.metrics.lagWords !== lagWords ||
          session.metrics.wpm !== wpm ||
          session.metrics.accuracy !== activeVisibleAccuracy ||
          session.metrics.trend !== trend ||
          session.metrics.score !== activeVisibleScore ||
          session.metrics.points !== activePoints ||
          !telemetryEquals(session.telemetry, nextTelemetry);

        if (!changed) {
          return session;
        }

        return {
          ...session,
          inputSettingsLocked,
          ttsText,
          ttsLanguage,
          ttsPracticeText,
          difficulty,
          status: nextStatus,
          metrics: {
            controllerState,
            rate,
            lagSec,
            lagWords,
            wpm,
            accuracy: activeVisibleAccuracy,
            trend,
            score: activeVisibleScore,
            points: activePoints,
          },
          telemetry: nextTelemetry,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, [
    activeSession,
    difficulty,
    inputSettingsLocked,
    lagSec,
    lagWords,
    rate,
    ttsText,
    ttsLanguage,
    ttsPracticeText,
    trend,
    accuracy,
    activePoints,
    activeVisibleAccuracy,
    activeVisibleScore,
    sessionStatus,
    controllerState,
    running,
    wpm,
  ]);
}
