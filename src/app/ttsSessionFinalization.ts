import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';
import type {
  StoredSession,
  TtsPerformanceSampleResult,
} from './sessionTypes';

export type FinalizedTtsSessionStateInput = {
  sessions: StoredSession[];
  activeSessionId: string | null;
  activeSession: StoredSession | null;
  latestPracticeText: string;
  finalSample: TtsPerformanceSampleResult;
  finishedAt: string;
  finalVoiceURI: string | null;
  finalTtsEnvironment: BrowserTtsEnvironmentFingerprint | null;
};

export type FinalizedTtsSessionState = {
  nextSessions: StoredSession[];
  finalizedSession: StoredSession | null;
};

export function buildFinalizedTtsSessionState({
  sessions,
  activeSessionId,
  activeSession,
  latestPracticeText,
  finalSample,
  finishedAt,
  finalVoiceURI,
  finalTtsEnvironment,
}: FinalizedTtsSessionStateInput): FinalizedTtsSessionState {
  const nextSessions = sessions.map((session) =>
    session.id === activeSessionId
      ? {
          ...session,
          ttsVoiceURI: session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE ? finalVoiceURI : session.ttsVoiceURI,
          ttsEnvironment: session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE ? finalTtsEnvironment : session.ttsEnvironment,
          ttsPracticeText: latestPracticeText,
          status: 'finished' as const,
          metrics: finalSample.metrics,
          telemetry: finalSample.telemetry,
          updatedAt: finishedAt,
        }
      : session,
  );
  const finalizedSession = nextSessions.find((session) => session.id === activeSessionId) ?? activeSession;

  return {
    nextSessions,
    finalizedSession,
  };
}
