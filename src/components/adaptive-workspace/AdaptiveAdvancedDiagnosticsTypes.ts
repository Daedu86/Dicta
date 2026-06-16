import type { InputMode } from '../../core/adaptive/types';
import type { SessionPointsSource } from '../../core/evaluation';
import type { SessionDurationInput } from '../../core/sessionDuration';
import type { SessionScoreMetrics } from '../../core/sessionScore';
import type { SessionTelemetry, Transcript } from '../../types/dictation';
import type { AdaptiveAdapterCardConfig } from './types';

export type AdaptiveAdvancedDiagnosticsExpandedState = {
  decision: boolean;
  architecture: boolean;
  adapters: boolean;
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
  adaptiveAdapters: AdaptiveAdapterCardConfig[];
  latestSession: AdaptiveLatestSession | null;
  latestInputAdapter: AdaptiveAdapterCardConfig | null;
  latestAdaptiveMode: string;
  selectedBenchmarkInputMode: InputMode;
  adaptiveSemanticDebug: AdaptiveSemanticDebug;
  mapSessionInputMode: (mode: AdaptiveAdapterCardConfig['inputMode']) => InputMode;
  onToggleDecisionArchitectureSections: () => void;
  onToggleAdaptersSection: () => void;
  onToggleLatestSections: () => void;
  onToggleTelemetrySection: () => void;
  onOpenAdapter: (inputMode: AdaptiveAdapterCardConfig['inputMode']) => void;
};
