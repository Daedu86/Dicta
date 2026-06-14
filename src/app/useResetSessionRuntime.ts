import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type {
  ControlAction,
  SessionTelemetry,
  TtsPacingMode,
} from '../types/dictation';
import { buildResetSessionState } from './resetSessionState';
import type {
  SessionStatus,
  StoredSession,
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';

export type ResetSessionRuntimeOptions = {
  activeSession: StoredSession | null;
  activeInputMode: string;
  inputSettingsLocked: boolean;
  ttsText: string;
  stopTtsPlayback: () => void;
  resetAdaptiveSessionFeedbackTracking: (sessionId: string | undefined) => void;
  allowFinishedSessionResetRef: MutableRefObject<string | null>;
  ttsPracticeLiveTextRef: MutableRefObject<string>;
  ttsStartedAtMsRef: MutableRefObject<number | null>;
  ttsChunkStartMsRef: MutableRefObject<number | null>;
  ttsChunkStartWordIndexRef: MutableRefObject<number>;
  ttsChunkWordCountRef: MutableRefObject<number>;
  ttsCompletedSourceWordsRef: MutableRefObject<number>;
  ttsLastControllerActionRef: MutableRefObject<ControlAction>;
  ttsUiLastPublishedAtRef: MutableRefObject<number>;
  ttsPublishedUiRef: MutableRefObject<TtsPublishedUiState>;
  telemetryRef: MutableRefObject<SessionTelemetry | null>;
  setTtsPracticeText: Dispatch<SetStateAction<string>>;
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
  setControllerState: Dispatch<SetStateAction<ControlAction>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus>>;
  setTrainingSubmitMessage: Dispatch<SetStateAction<string>>;
  setInputSettingsLocked: Dispatch<SetStateAction<boolean>>;
};

export type ResetSessionRuntimeAction = (options?: { preserveInputSettingsLock?: boolean }) => void;

export function createResetSessionRuntime({
  activeSession,
  activeInputMode,
  inputSettingsLocked,
  ttsText,
  stopTtsPlayback,
  resetAdaptiveSessionFeedbackTracking,
  allowFinishedSessionResetRef,
  ttsPracticeLiveTextRef,
  ttsStartedAtMsRef,
  ttsChunkStartMsRef,
  ttsChunkStartWordIndexRef,
  ttsChunkWordCountRef,
  ttsCompletedSourceWordsRef,
  ttsLastControllerActionRef,
  ttsUiLastPublishedAtRef,
  ttsPublishedUiRef,
  telemetryRef,
  setTtsPracticeText,
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
  setControllerState,
  setSessionStatus,
  setTrainingSubmitMessage,
  setInputSettingsLocked,
}: ResetSessionRuntimeOptions): ResetSessionRuntimeAction {
  return function resetSession(options: { preserveInputSettingsLock?: boolean } = {}): void {
    const resetState = buildResetSessionState({
      preserveInputSettingsLock: options.preserveInputSettingsLock,
      inputSettingsLocked,
      ttsText,
      activeInputMode,
    });

    if (activeSession?.status === 'finished') {
      allowFinishedSessionResetRef.current = activeSession.id;
    }

    stopTtsPlayback();
    setTtsPracticeText(resetState.ttsPracticeText);
    ttsPracticeLiveTextRef.current = resetState.ttsPracticeText;
    setTtsStatus(resetState.ttsStatus);
    setTtsCurrentChunk(resetState.ttsCurrentChunk);
    setTtsPacingMode(resetState.ttsPacingMode);
    setTtsSpeechRate(resetState.ttsSpeechRate);
    ttsStartedAtMsRef.current = resetState.refs.ttsStartedAtMs;
    ttsChunkStartMsRef.current = resetState.refs.ttsChunkStartMs;
    ttsChunkStartWordIndexRef.current = resetState.refs.ttsChunkStartWordIndex;
    ttsChunkWordCountRef.current = resetState.refs.ttsChunkWordCount;
    ttsCompletedSourceWordsRef.current = resetState.refs.ttsCompletedSourceWords;
    ttsLastControllerActionRef.current = resetState.refs.ttsLastControllerAction;
    setRunning(resetState.running);
    setRate(resetState.rate);
    setLagSec(resetState.lagSec);
    setLagWords(resetState.lagWords);
    setWpm(resetState.wpm);
    setAccuracy(resetState.accuracy);
    setControllerState(resetState.controllerState);
    ttsUiLastPublishedAtRef.current = resetState.refs.ttsUiLastPublishedAt;
    ttsPublishedUiRef.current = resetState.publishedUi;
    setSessionStatus(resetState.sessionStatus);
    setTrainingSubmitMessage(resetState.trainingSubmitMessage);
    setInputSettingsLocked(resetState.nextInputSettingsLocked);
    telemetryRef.current = resetState.refs.telemetry;
    resetAdaptiveSessionFeedbackTracking(activeSession?.id);
  };
}

export function useResetSessionRuntime(options: ResetSessionRuntimeOptions): ResetSessionRuntimeAction {
  return createResetSessionRuntime(options);
}
