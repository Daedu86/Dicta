import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode } from '../../core/adaptive/types';
import type { AdaptiveBenchmarksByInputLanguage, BenchmarkLanguageButton } from '../openrouter/types';
import type { AdaptiveAdapterCardConfig, AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';

export type AdaptiveAdapterCardProps = {
  adapter: AdaptiveAdapterCardConfig;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
};

export type AdaptiveProfileMatrixProps = {
  adapters: AdaptiveAdapterCardConfig[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  selectedInputMode: InputMode;
  selectedLanguage: BenchmarkLanguageButton;
  onSelect: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
};

export type AdaptiveBenchmarkSectionProps = {
  id?: string;
  adapters: AdaptiveAdapterCardConfig[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  expanded: boolean;
  onToggleExpanded: () => void;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  selectedInputMode: InputMode;
  selectedLanguage: BenchmarkLanguageButton;
  selectedProfile: InputLanguageBenchmarkMetrics;
  repeatWordStats: RepeatWordStat[];
  formatSessionDate: (value: string) => string;
  onSelect: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
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
