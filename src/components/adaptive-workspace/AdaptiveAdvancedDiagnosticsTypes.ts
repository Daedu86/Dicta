import type { SessionPointsSource } from '../../core/evaluation';
import type { SessionDurationInput } from '../../core/sessionDuration';
import type { SessionScoreMetrics } from '../../core/sessionScore';
import type { SessionTelemetry, Transcript } from '../../types/dictation';
import type { AdaptiveAdapterCardConfig } from './types';

export type AdaptiveAdvancedDiagnosticsExpandedState = {
  decision: boolean;
  architecture: boolean;
  latest: boolean;
  live: boolean;
  telemetry: boolean;
};

export type AdaptiveSessionMetrics = SessionScoreMetrics & {
  lagWords: number;
  trend: 'improving' | 'stable' | 'declining';
};

export type AdaptiveLatestSession = Omit<SessionDurationInput, 'inputMode' | 'telemetry' | 'transcript'> &
  Omit<SessionPointsSource, 'inputMode' | 'transcript'> & {
    name?: string | null;
    updatedAt: string;
    inputMode: AdaptiveAdapterCardConfig['inputMode'];
    transcript?: Transcript | null;
    metrics: AdaptiveSessionMetrics;
    telemetry: SessionTelemetry;
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
  totalSemanticPhrases: number;
  currentPhraseId: string;
  currentPhraseTextPreview: string | null;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
};

export type AdaptiveAdvancedDiagnosticsProps = {
  adaptiveSectionExpanded: AdaptiveAdvancedDiagnosticsExpandedState;
  latestSession: AdaptiveLatestSession | null;
  latestInputAdapter: AdaptiveAdapterCardConfig | null;
  latestAdaptiveMode: string;
  adaptiveSemanticDebug: AdaptiveSemanticDebug;
  onToggleDecisionArchitectureSections: () => void;
  onToggleLatestSections: () => void;
  onToggleTelemetrySection: () => void;
};
