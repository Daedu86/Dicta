import { useMemo } from 'react';
import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';
import { perfDiagnostics } from '../core/perfDiagnostics';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { buildTrainingSubmitMessage } from '../core/trainingSubmitMessage';
import type { TtsPerformanceSampleOptions } from './useTtsPerformanceSampler';
import { buildFinalizedTtsSessionState } from './ttsSessionFinalization';
import type {
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPerformanceSampleResult,
  TtsStatus,
} from './sessionTypes';

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export type TtsSubmitPerfSpanStarter = (
  name: 'tts.submit',
  context: { inputMode: string },
) => () => void;

export type TtsSessionSubmitVoiceResolution = {
  voice: SpeechSynthesisVoice | null;
  voiceURI: string | null;
  usedFallback?: boolean;
};

export type TtsSessionSubmitActionOptions = {
  activeInputMode: string;
  ttsHasText: boolean;
  ttsPracticeText: string;
  ttsLanguage: TtsLanguage;
  sessions: StoredSession[];
  activeSessionId: string | null;
  activeSession: StoredSession | null;
  applyTtsPerformanceSample: (options?: TtsPerformanceSampleOptions) => TtsPerformanceSampleResult;
  resolveBrowserTtsVoiceForSession: (
    session: StoredSession | null | undefined,
    language?: TtsLanguage,
  ) => TtsSessionSubmitVoiceResolution;
  collectBrowserTtsEnvironmentForSession: (
    session: StoredSession | null | undefined,
    selectedVoice?: SpeechSynthesisVoice | null,
    selectedVoiceURI?: string | null,
  ) => BrowserTtsEnvironmentFingerprint | null;
  persistAndPushSessionsNow: (
    nextSessions: StoredSession[],
    options?: { criticalSessionIds?: string[] },
  ) => void;
  stopTtsPlayback: () => void;
  completeAdaptiveSessionFeedback: (session: StoredSession | null) => void;
  setTtsPracticeText: StateSetter<string>;
  setSessions: StateSetter<StoredSession[]>;
  setRunning: StateSetter<boolean>;
  setSessionStatus: StateSetter<SessionStatus>;
  setTtsStatus: StateSetter<TtsStatus>;
  setError: StateSetter<string>;
  setTrainingSubmitMessage: StateSetter<string>;
  startPerfSpan?: TtsSubmitPerfSpanStarter;
  nowIso?: () => string;
};

export type TtsSessionSubmitAction = (latestPracticeText?: string) => void;

export function createTtsSessionSubmitAction({
  activeInputMode,
  ttsHasText,
  ttsPracticeText,
  ttsLanguage,
  sessions,
  activeSessionId,
  activeSession,
  applyTtsPerformanceSample,
  resolveBrowserTtsVoiceForSession,
  collectBrowserTtsEnvironmentForSession,
  persistAndPushSessionsNow,
  stopTtsPlayback,
  completeAdaptiveSessionFeedback,
  setTtsPracticeText,
  setSessions,
  setRunning,
  setSessionStatus,
  setTtsStatus,
  setError,
  setTrainingSubmitMessage,
  startPerfSpan = (name, context) => perfDiagnostics.startSpan(name, context),
  nowIso = () => new Date().toISOString(),
}: TtsSessionSubmitActionOptions): TtsSessionSubmitAction {
  return function submitTtsSession(latestPracticeText = ttsPracticeText): void {
    const endPerfSpan = startPerfSpan('tts.submit', { inputMode: activeInputMode });
    if (!ttsHasText || !latestPracticeText.trim()) {
      setError('Paste TTS text and type your attempt before submitting.');
      setTrainingSubmitMessage('');
      endPerfSpan();
      return;
    }

    try {
      if (latestPracticeText !== ttsPracticeText) {
        setTtsPracticeText(latestPracticeText);
      }
      const finalSample = applyTtsPerformanceSample({
        action: 'submit',
        finalize: true,
        practiceTextOverride: latestPracticeText,
      });
      const finishedAt = nowIso();
      const finalVoiceResolution =
        activeSession?.inputMode === BROWSER_TTS_SESSION_INPUT_MODE
          ? resolveBrowserTtsVoiceForSession(activeSession, ttsLanguage)
          : null;
      const finalVoiceURI = finalVoiceResolution?.voiceURI ?? activeSession?.ttsVoiceURI ?? null;
      const finalTtsEnvironment = collectBrowserTtsEnvironmentForSession(
        activeSession,
        finalVoiceResolution?.voice ?? null,
        finalVoiceURI,
      );
      const { nextSessions, finalizedSession } = buildFinalizedTtsSessionState({
        sessions,
        activeSessionId,
        activeSession,
        latestPracticeText,
        finalSample,
        finishedAt,
        finalVoiceURI,
        finalTtsEnvironment,
      });
      setSessions(nextSessions);
      persistAndPushSessionsNow(nextSessions, {
        criticalSessionIds: activeSessionId ? [activeSessionId] : [],
      });
      stopTtsPlayback();
      setRunning(false);
      setSessionStatus('finished');
      setTtsStatus('finished');
      completeAdaptiveSessionFeedback(finalizedSession);
      setError('');
      if (activeSessionId) {
        setTrainingSubmitMessage(buildTrainingSubmitMessage(nextSessions, activeSessionId));
      }
    } finally {
      endPerfSpan();
    }
  };
}

export function useTtsSessionSubmitAction(options: TtsSessionSubmitActionOptions): TtsSessionSubmitAction {
  return useMemo(
    () => createTtsSessionSubmitAction(options),
    [
      options.activeInputMode,
      options.activeSession,
      options.activeSessionId,
      options.applyTtsPerformanceSample,
      options.collectBrowserTtsEnvironmentForSession,
      options.completeAdaptiveSessionFeedback,
      options.nowIso,
      options.persistAndPushSessionsNow,
      options.resolveBrowserTtsVoiceForSession,
      options.sessions,
      options.setError,
      options.setRunning,
      options.setSessionStatus,
      options.setSessions,
      options.setTrainingSubmitMessage,
      options.setTtsPracticeText,
      options.setTtsStatus,
      options.startPerfSpan,
      options.stopTtsPlayback,
      options.ttsHasText,
      options.ttsLanguage,
      options.ttsPracticeText,
    ],
  );
}
