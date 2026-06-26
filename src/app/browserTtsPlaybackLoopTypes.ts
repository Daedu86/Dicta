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
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import type { BrowserTtsSafePauseGateSettings } from './browserTtsNextChunkScheduler';
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
  browserTtsSafePauseGateSettings: BrowserTtsSafePauseGateSettings;
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
  ttsPracticeLastInputAtMsRef: MutableRefObject<number>;
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
  setTtsPracticeText: Dispatch<SetStateAction<string>>;
  setTtsPacingMode: Dispatch<SetStateAction<TtsPacingMode>>;
  setTtsSpeechRate: Dispatch<SetStateAction<number>>;
  setTtsStatus: Dispatch<SetStateAction<TtsStatus>>;
  setRunning: Dispatch<SetStateAction<boolean>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus>>;
  setError: Dispatch<SetStateAction<string>>;
};

export type BrowserTtsPlaybackCursorPosition = {
  chunkIndex: number;
  macroPhraseIndex: number;
  macroWordOffset: number;
};

export type BrowserTtsPlaybackCursorSnapshot = BrowserTtsPlaybackCursorPosition & {
  lastPhraseSize: BrowserTtsPlaybackPlan['nextLastPhraseSize'];
  lastBoundaryStrictness: BrowserTtsPlaybackPlan['nextLastBoundaryStrictness'];
};

export type BrowserTtsPlaybackRunContext = {
  activeSession: StoredSession | null;
  ttsText: string;
  ttsLanguage: TtsLanguage;
  ttsTranscript: Transcript | null;
  ttsPracticeLastInputAtMsRef: BrowserTtsPlaybackLoopOptions['ttsPracticeLastInputAtMsRef'];
  ttsSpeechRate: number;
  ttsPlaybackProfile: TtsPlaybackProfile;
  browserTtsSafePauseGateSettings: BrowserTtsSafePauseGateSettings;
  browserTtsVoices: SpeechSynthesisVoice[];
  browserTtsVoice: SpeechSynthesisVoice | null;
  browserTtsEnvironment: ReturnType<BrowserTtsPlaybackLoopOptions['collectBrowserTtsEnvironmentForSession']>;
  perfDiagnostics: PerfDiagnostics;
  perfPlayId: number;
  speakBrowserTts: BrowserTtsPlaybackLoopOptions['speakBrowserTts'];
  ttsUtteranceRef: BrowserTtsPlaybackLoopOptions['ttsUtteranceRef'];
};

export type BrowserTtsPlaybackMacroPhraseContext = {
  semanticPhrase: SemanticPhrase;
  semanticPhrases: SemanticPhrase[];
  macroWords: string[];
  macroStartWordIndex: number;
  sourceWordCount: number;
  macroPhraseIndex: number;
  macroWordOffset: number;
};

export type BrowserTtsPlaybackProgressContext = {
  ttsCompletedSourceWordsRef: BrowserTtsPlaybackLoopOptions['ttsCompletedSourceWordsRef'];
  ttsChunkStartMsRef: BrowserTtsPlaybackLoopOptions['ttsChunkStartMsRef'];
  ttsChunkStartWordIndexRef: BrowserTtsPlaybackLoopOptions['ttsChunkStartWordIndexRef'];
  ttsChunkWordCountRef: BrowserTtsPlaybackLoopOptions['ttsChunkWordCountRef'];
};

export type BrowserTtsPlaybackAdaptiveContext = {
  ttsChunkAccuracyWindowRef: BrowserTtsPlaybackLoopOptions['ttsChunkAccuracyWindowRef'];
  ttsLastAccuracySnapshotRef: BrowserTtsPlaybackLoopOptions['ttsLastAccuracySnapshotRef'];
  ttsUnsafeChunkCountRef: BrowserTtsPlaybackLoopOptions['ttsUnsafeChunkCountRef'];
  ttsSemanticPhraseAdvanceCountRef: BrowserTtsPlaybackLoopOptions['ttsSemanticPhraseAdvanceCountRef'];
  ttsSemanticPhraseReplayCountRef: BrowserTtsPlaybackLoopOptions['ttsSemanticPhraseReplayCountRef'];
  ttsLiveSignalRef: BrowserTtsPlaybackLoopOptions['ttsLiveSignalRef'];
  setAdaptiveSemanticDebug: BrowserTtsPlaybackLoopOptions['setAdaptiveSemanticDebug'];
};

export type BrowserTtsPlaybackTelemetryContext = {
  perfDiagnostics: BrowserTtsPlaybackLoopOptions['perfDiagnostics'];
  recordTtsChunkTelemetry: BrowserTtsPlaybackLoopOptions['recordTtsChunkTelemetry'];
  recordAdaptiveBenchmark: BrowserTtsPlaybackLoopOptions['recordAdaptiveBenchmark'];
  recordPhrasePlaybackEvent: BrowserTtsPlaybackLoopOptions['recordPhrasePlaybackEvent'];
  applyTtsPerformanceSample: BrowserTtsPlaybackLoopOptions['applyTtsPerformanceSample'];
};

export type BrowserTtsPlaybackUiContext = {
  setTtsCurrentChunk: BrowserTtsPlaybackLoopOptions['setTtsCurrentChunk'];
  setTtsPracticeText: BrowserTtsPlaybackLoopOptions['setTtsPracticeText'];
  setTtsPacingMode: BrowserTtsPlaybackLoopOptions['setTtsPacingMode'];
  setTtsSpeechRate: BrowserTtsPlaybackLoopOptions['setTtsSpeechRate'];
  setTtsStatus: BrowserTtsPlaybackLoopOptions['setTtsStatus'];
  setError: BrowserTtsPlaybackLoopOptions['setError'];
  setRunning: BrowserTtsPlaybackLoopOptions['setRunning'];
  setSessionStatus: BrowserTtsPlaybackLoopOptions['setSessionStatus'];
};

export type BrowserTtsPlaybackChunkCallbacks = {
  speakNext: () => void;
  updatePlaybackCursor: (cursor: BrowserTtsPlaybackCursorPosition) => void;
  setCancelled: (cancelled: boolean) => void;
};
