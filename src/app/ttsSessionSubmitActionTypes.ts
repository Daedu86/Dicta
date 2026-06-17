import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';
import type { TtsPerformanceSampleOptions } from './useTtsPerformanceSampler';
import type {
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPerformanceSampleResult,
  TtsStatus,
} from './sessionTypes';

export type StateSetter<T> = (value: T | ((current: T) => T)) => void;

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
