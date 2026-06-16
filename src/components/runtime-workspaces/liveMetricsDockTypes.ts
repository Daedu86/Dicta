import type { InputMode } from '../../core/adaptive/types';
import type {
  LanguageRangeSummary,
  MetricsLanguageView,
  MetricsRangeView,
  SessionForMetrics,
} from '../../core/liveMetrics';
import type { TtsPacingMode } from '../../types/dictation';

export type PerformanceTrend = 'improving' | 'stable' | 'declining';
export type RuntimeWorkspaceMode = string;
export type RuntimeTtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';
export type RuntimeSessionInputMode = string;

export type LiveMetricsDockProps = {
  insightsCollapsed: boolean;
  metricsLanguageView: MetricsLanguageView;
  metricsRangeView: MetricsRangeView;
  trend: PerformanceTrend;
  insightsDiagnosticInputOptions: ReadonlyArray<{ inputMode: InputMode; label: string }>;
  insightsDiagnosticInputMode: InputMode;
  insightsDiagnosticMessage: string;
  insightsDiagnosticFallbackReport: string;
  workspaceMode: RuntimeWorkspaceMode;
  hasTtsCurrentChunk: boolean;
  ttsPacingMode: TtsPacingMode;
  ttsStatus: RuntimeTtsStatus;
  lastSessionForLanguage: SessionForMetrics | null;
  lastSessionScoreHelpText?: string;
  languageTodaySummary: LanguageRangeSummary;
  onChangeMetricsLanguageView: (language: MetricsLanguageView) => void;
  onChangeMetricsRangeView: (range: MetricsRangeView) => void;
  onChangeInsightsDiagnosticInputMode: (inputMode: InputMode) => void;
  onCopyInsightsDiagnosticPackage: () => void | Promise<void>;
  onToggleInsightsCollapsed: () => void;
  onSelectInsightsDiagnosticFallbackReport: () => void;
  formatInputModeLabel: (inputMode: InputMode) => string;
  formatSessionInputMode: (inputMode: RuntimeSessionInputMode) => string;
  formatDuration: (seconds: number) => string;
  formatSessionDate: (value: string) => string;
  formatTtsPacingMode: (mode: TtsPacingMode) => string;
};
