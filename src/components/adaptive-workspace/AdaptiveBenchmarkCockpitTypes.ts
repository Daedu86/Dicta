import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import type { AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';
import type { useAdaptiveBenchmarkCockpitRuntime } from './useAdaptiveBenchmarkCockpitRuntime';

export type AdaptiveBenchmarkCockpitProps = {
  profile: InputLanguageBenchmarkMetrics;
  inputTitle: string;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  repeatWordStats: RepeatWordStat[];
  formatSessionDate: (value: string) => string;
  benchmarkExportMessage: string;
  sessionFeedback: AdaptiveSessionFeedback | null;
  sessionFeedbackMessage: string;
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

export type AdaptiveBenchmarkCockpitRuntime = ReturnType<typeof useAdaptiveBenchmarkCockpitRuntime>;
export type AdaptiveBenchmarkCockpitSectionId = keyof AdaptiveBenchmarkCockpitRuntime['workspaceSubsectionsExpanded'];
