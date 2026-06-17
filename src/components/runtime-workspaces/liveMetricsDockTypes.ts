import type { InputMode } from '../../core/adaptive/types';
import type {
  LanguageRangeSummary,
  MetricsLanguageView,
  MetricsRangeView,
  SessionForMetrics,
} from '../../core/liveMetrics';

export type PerformanceTrend = 'improving' | 'stable' | 'declining';
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
};
