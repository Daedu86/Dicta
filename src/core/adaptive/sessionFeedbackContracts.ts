import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  PhrasePlaybackEvent,
} from './types';
import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';

export type SessionFeedbackBuildArgs = {
  sessionId: string;
  inputMode: InputMode;
  language: LanguageCode;
  sourceType: AdaptiveSessionFeedback['sourceType'];
  createdAt: string;
  completedAt?: string;
  scriptId?: string;
  scriptTitle?: string;
  benchmarkBefore?: InputLanguageBenchmarkMetrics | null;
  benchmarkAfter?: InputLanguageBenchmarkMetrics | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  phraseEvents: PhrasePlaybackEvent[];
  totalPhrases?: number;
};

export type SessionFeedbackReference = {
  sessionId: string;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
  completedAt?: string;
  scriptId?: string;
  scriptTitle?: string;
};

export type TimelinePlaybackDiagnostics = {
  source: 'formal_feedback' | 'timeline_fallback';
  repeatedPhraseIndices: Array<{
    phraseIndex: number;
    phraseId?: string;
    textPreview?: string;
    repeatCount: number;
  }>;
  repeatedPhraseCount: number;
  maxRepeatCountForSinglePhrase: number;
  replayCount: number;
  deferPauseCount: number;
  phraseIndexJumpCount: number;
  repeatedPhrasePreviews: string[];
};
