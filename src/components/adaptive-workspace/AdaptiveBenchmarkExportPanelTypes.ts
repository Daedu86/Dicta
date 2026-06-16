import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import type { useAdaptiveBenchmarkCockpitRuntime } from './useAdaptiveBenchmarkCockpitRuntime';

export type AdaptiveBenchmarkExportPayloads = NonNullable<ReturnType<typeof useAdaptiveBenchmarkCockpitRuntime>['exportPayloads']>;

export type AdaptiveBenchmarkExportPanelProps = {
  profile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  exportPanelOpen: boolean;
  setExportPanelOpen: (value: boolean) => void;
  exportPayloads: AdaptiveBenchmarkExportPayloads | null;
  hasBenchmarkData: boolean;
  hasSessionFeedback: boolean;
  humanFeedbackEditorOpen: boolean;
  setHumanFeedbackEditorOpen: (value: boolean) => void;
  humanFeedbackDraft: string;
  setHumanFeedbackDraft: (value: string) => void;
  setExportStatusMessage: (message: string) => void;
  copyToClipboard: (label: string, text: string) => Promise<void>;
  formatPromptSizeHint: (value: string) => string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
};

export type AdaptiveBenchmarkExportSectionProps = Pick<
  AdaptiveBenchmarkExportPanelProps,
  | 'profile'
  | 'sessionFeedback'
  | 'exportPayloads'
  | 'hasBenchmarkData'
  | 'hasSessionFeedback'
  | 'setHumanFeedbackEditorOpen'
  | 'setExportStatusMessage'
  | 'copyToClipboard'
  | 'formatPromptSizeHint'
  | 'onCopyBenchmark'
  | 'onExportBenchmark'
  | 'onCopyScriptPrompt'
  | 'onCopyBenchmarkWithScriptPrompt'
  | 'onCopyScriptTemplate'
  | 'onCopySessionFeedback'
  | 'onCopyBenchmarkFeedback'
  | 'onCopyBenchmarkFeedbackPrompt'
> & {
  exportPayloads: AdaptiveBenchmarkExportPayloads;
};
