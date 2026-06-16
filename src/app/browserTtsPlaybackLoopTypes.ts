import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  BrowserTtsEnvironmentFingerprint,
  ControlAction,
  Transcript,
  TtsPacingMode,
} from '../types/dictation';
import type { PerfDiagnostics } from '../core/perfDiagnostics';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type { AdaptiveRuntime } from './useAdaptiveRuntime';
import type {
  AdaptiveSemanticDebug,
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPerformanceSampleResult,
  TtsStatus,
} from './sessionTypes';
import type { TtsLiveSignal, TtsPlaybackProfile } from './ttsPlaybackProfile';
import type { TtsPerformanceSampleOptions } from './useTtsPerformanceSampler';
import type { TtsTelemetryRecorder } from './useTtsTelemetryRecorder';

export type BrowserTtsEnvironmentResolver = (
  session: StoredSession | null | undefined,
  selectedVoice?: SpeechSynthesisVoice | null,
  selectedVoiceURI?: string | null | undefined,
) => BrowserTtsEnvironmentFingerprint | null;

export type BrowserTtsPlaybackLoopOptions = {
  activeSessionFinished: boolean;
  activeSession: StoredSession | null;
  ttsStatus: TtsStatus;
  ttsText: string;
  ttsLanguage: TtsLanguage;
  ttsPacingMode: TtsPacingMode;
  ttsSpeechRate: number;
  ttsTranscript: Transcript | null;
  browserTtsVoices: SpeechSynthesisVoice[];
  ttsPlaybackProfile: TtsPlaybackProfile;
  perfDiagnostics: PerfDiagnostics;
  stopTtsPlaybackRef: MutableRefObject<() => void>;
  ttsPausedAtWordIndexRef: MutableRefObject<number | null>;
  ttsCompletedSourceWordsRef: MutableRefObject<number>;
  ttsStartedAtMsRef: MutableRefObject<number | null>;
  ttsLagOutlierCountRef: MutableRefObject<number>;
  ttsLastValidControlLagSecRef: MutableRefObject<number>;
  ttsUnsafeChunkCountRef: MutableRefObject<number>;
  ttsChunkAccuracyWindowRef: MutableRefObject<number[]>;
  ttsLastAccuracySnapshotRef: MutableRefObject<{ typedWords: number; matchedWords: number }>;
  ttsLastControllerActionRef: MutableRefObject<ControlAction>;
  ttsLiveSignalRef: MutableRefObject<TtsLiveSignal>;
  ttsPracticeLiveTextRef: MutableRefObject<string>;
  ttsUtteranceRef: MutableRefObject<SpeechSynthesisUtterance | null>;
  ttsChunkStartMsRef: MutableRefObject<number | null>;
  ttsChunkStartWordIndexRef: MutableRefObject<number>;
  ttsChunkWordCountRef: MutableRefObject<number>;
  ttsSemanticPhraseAdvanceCountRef: MutableRefObject<number>;
  ttsSemanticPhraseReplayCountRef: MutableRefObject<number>;
  buildSemanticPhrasesForCurrentSession: (text: string, language: string | undefined, mode: TtsPacingMode) => SemanticPhrase[];
  isBrowserTtsSupported: () => boolean;
  speakBrowserTts: (utterance: SpeechSynthesisUtterance) => boolean;
  resolveActiveBrowserTtsVoice: () => SpeechSynthesisVoice | null;
  collectBrowserTtsEnvironmentForSession: BrowserTtsEnvironmentResolver;
  getHistoricalPerformanceProfile: AdaptiveRuntime['getHistoricalPerformanceProfile'];
  getBenchmarkSnapshot: AdaptiveRuntime['getBenchmarkSnapshot'];
  getAdaptiveController: AdaptiveRuntime['getAdaptiveController'];
  beginAdaptiveSessionFeedback: AdaptiveRuntime['beginAdaptiveSessionFeedback'];
  recordPhrasePlaybackEvent: AdaptiveRuntime['recordPhrasePlaybackEvent'];
  recordAdaptiveBenchmark: AdaptiveRuntime['recordAdaptiveBenchmark'];
  estimateTtsSpokenWordIndex: (now?: number) => number;
  ensureAttemptTelemetry: TtsTelemetryRecorder['ensureAttemptTelemetry'];
  recordTtsTelemetryAction: TtsTelemetryRecorder['recordTtsTelemetryAction'];
  recordTtsChunkTelemetry: TtsTelemetryRecorder['recordTtsChunkTelemetry'];
  applyTtsPerformanceSample: (options?: TtsPerformanceSampleOptions) => TtsPerformanceSampleResult;
  setAdaptiveSemanticDebug: Dispatch<SetStateAction<AdaptiveSemanticDebug>>;
  setTtsCurrentChunk: Dispatch<SetStateAction<string>>;
  setTtsPacingMode: Dispatch<SetStateAction<TtsPacingMode>>;
  setTtsSpeechRate: Dispatch<SetStateAction<number>>;
  setTtsStatus: Dispatch<SetStateAction<TtsStatus>>;
  setRunning: Dispatch<SetStateAction<boolean>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus>>;
  setError: Dispatch<SetStateAction<string>>;
};
