import type {
  BrowserTtsEnvironmentFingerprint,
  ControlAction,
  SessionTelemetry,
} from '../types/dictation';
import type {
  AdaptiveTimelinePoint,
  PhraseBoundaryType,
} from '../core/adaptive/types';
import type { Difficulty } from '../core/config';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { SupportedLanguage } from '../core/languages';
import type { CreatedDeviceKind } from '../core/sessionDevice';
import type { SessionInputMode } from '../core/sessionInputModes';

export type StoredSession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputMode: SessionInputMode;
  inputSettingsLocked: boolean;
  ttsText: string;
  ttsLanguage: TtsLanguage | null;
  ttsVoiceURI?: string | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  ttsPracticeText: string;
  difficulty: Difficulty;
  status: SessionStatus;
  metrics: SessionMetrics;
  telemetry: SessionTelemetry;
  sessionSource: SessionSource;
  generationOrigin: GenerationOrigin;
  createdDeviceKind: CreatedDeviceKind;
  createdDeviceLabel?: string;
  dictationScript: DictationScript | null;
  generationError?: string;
};

export type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';

export type SessionSource = 'plainText' | 'dictationScript';
export type AuthView = 'signIn' | 'forgotPassword' | 'updatePassword';
export type GenerationOrigin = 'manual' | 'openrouter' | 'fallback-template';
export type TtsLanguage = SupportedLanguage;
export type TypingLanguage = SupportedLanguage;
export type KeyboardProfile = 'es-virtual' | 'de-keyboard' | null;
export type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';
export type PerformanceTrend = 'improving' | 'stable' | 'declining';

export type SessionMetrics = {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: PerformanceTrend;
  score: number;
  points: number;
};

export type DictaDebugSampleAudit = {
  acceptedForBenchmark: boolean;
  rejectionReason: string | null;
  event: AdaptiveTimelinePoint['event'];
  phraseId?: string;
  phraseIndex?: number;
  rawLagSec?: number;
  lagSec: number;
  stableLagSec?: number;
  phraseBoundaryType?: PhraseBoundaryType;
  semanticCompleteness?: number;
  accuracy: number;
  wpm: number;
  sessionId?: string;
  timestampMs: number;
};

export type TtsPerformanceSampleResult = {
  metrics: SessionMetrics;
  telemetry: SessionTelemetry;
};

export type TtsPublishedUiState = {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: PerformanceTrend;
};

export type AdminFileInventory = {
  projectRoot: string;
  folders: Array<{
    label: string;
    relativePath: string;
    absolutePath: string;
    exists: boolean;
    fileCount: number;
    totalBytes: number;
    wavCount: number;
    jsonCount: number;
    transcriptCount: number;
  }>;
};

export type AdaptiveSemanticDebug = {
  semanticCutPenalty: number;
  unsafePauseCount: number;
  safePauseCount: number;
  deferredPauseCount: number;
  replayDeniedByBoundaryCount: number;
  averageSemanticCompleteness: number;
  averagePhraseDifficulty: number;
  inputExecutionFidelityScore: number;
  currentPhraseIndex: number;
  currentPhraseId: string;
  currentPhraseTextPreview: string;
  totalSemanticPhrases: number;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
};
