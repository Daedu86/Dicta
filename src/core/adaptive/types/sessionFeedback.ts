import type { StoredInputMode } from '../inputModes';
import type { ListeningPrecisionMetrics } from '../listeningPrecisionMetrics';
import type { BrowserTtsEnvironmentFingerprint } from '../../../types/dictation';
import type { InputLanguageBenchmarkMetrics } from './benchmark';
import type { LanguageCode } from './pacing';

export type PhrasePlaybackEventType =
  | 'phrase_started'
  | 'phrase_completed'
  | 'phrase_replayed'
  | 'phrase_skipped'
  | 'phrase_advanced';

export interface PhrasePlaybackEvent {
  sessionId: string;
  phraseId: string;
  phraseIndex: number;
  textPreview: string;
  event: PhrasePlaybackEventType;
  timestampMs: number;
  inputMode: StoredInputMode;
  language: LanguageCode;
}

export interface AdaptiveSessionFeedback {
  sessionId: string;
  inputMode: StoredInputMode;
  language: LanguageCode;
  scriptId?: string;
  scriptTitle?: string;
  createdAt: string;
  completedAt?: string;
  sourceType: 'plain_text' | 'dictation_script';
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  benchmarkBefore?: Partial<InputLanguageBenchmarkMetrics>;
  benchmarkAfter?: Partial<InputLanguageBenchmarkMetrics>;
  sessionCountDroppedReason?: string;
  listeningPrecisionSummary?: ListeningPrecisionMetrics;
  improvementDelta: {
    accuracyDelta: number;
    lagDelta: number;
    wpmDelta: number;
    sweetSpotScoreDelta: number;
    semanticFidelityDelta: number;
    controlFidelityDelta: number;
    learningEffectivenessDelta: number;
    flowStabilityDelta: number;
    overallImprovementScore: number;
  };
  playbackIssues: {
    repeatedPhraseCount: number;
    maxRepeatCountForSinglePhrase: number;
    repeatedPhrases: Array<{
      phraseId: string;
      textPreview: string;
      repeatCount: number;
      timestampsMs: number[];
    }>;
    skippedPhraseCount: number;
    skippedPhrases: Array<{
      phraseId: string;
      textPreview: string;
      expectedIndex: number;
    }>;
    outOfOrderAdvanceCount: number;
    replayAdvancedPhraseCount: number;
    phraseIndexJumpCount: number;
  };
  phraseStats: {
    totalPhrases: number;
    completedPhrases: number;
    replayCount: number;
    phraseAdvanceCount: number;
    averageRepeatsPerPhrase: number;
  };
  verdict: 'improved' | 'stable' | 'regressed' | 'inconclusive';
  notes: string[];
}
