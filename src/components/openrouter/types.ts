import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode } from '../../core/adaptive/types';
import type { SupportedLanguage } from '../../core/languages';

export type OpenRouterJobNotification = {
  jobId: string;
  slotLabel: string;
  model: string;
  startedAt: string;
  status: 'running' | 'succeeded' | 'failed';
  completedAt?: string;
  error?: string;
};

export type OpenRouterModelSummary = { id: string; name?: string; context_length?: number };

export type TrainingGenerationNotice = {
  slotLabel: string;
  displayLabel: string;
  model: string;
  startedAt: string;
  status: 'running' | 'succeeded' | 'failed';
  completedAt?: string;
  error?: string;
};

export type TrainingGenerationNoticeView = {
  message: string;
  tone: 'hint' | 'success' | 'error';
};

export type AdaptiveBenchmarksByInputLanguage = Record<string, Record<string, InputLanguageBenchmarkMetrics>>;
export type AdaptiveSessionFeedbackByInputLanguage = Record<string, Record<string, AdaptiveSessionFeedback[]>>;
export type BenchmarkLanguageButton = SupportedLanguage;

export type PersistedOpenRouterGeneration = {
  text: string;
  json: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  elapsedMs: number | null;
};

export type OpenRouterGenerationSlotId = 'prompt1' | 'prompt2';

export type OpenRouterGenerationUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type OpenRouterGenerationSlotState = {
  notes: string;
  model: string;
  text: string;
  json: string;
  inputMode: InputMode | null;
  language: BenchmarkLanguageButton | null;
  usage: OpenRouterGenerationUsage | null;
  elapsedMs: number | null;
  generatedAt: string | null;
  error: string;
};

export type OpenRouterGenerationSlots = Record<OpenRouterGenerationSlotId, OpenRouterGenerationSlotState>;

export type OpenRouterWorkspaceProps = {
  defaultModel: string;
  assignedModel: string | null;
  authHeaders: Record<string, string>;
  onSetDefaultModel: (value: string) => void;
  models: OpenRouterModelSummary[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  onRefreshModels: () => Promise<void>;
  onBackToTraining: () => void;
  exportProfile: InputLanguageBenchmarkMetrics;
  exportSessionFeedback: AdaptiveSessionFeedback | null;
  exportActiveSessionStatus: string | undefined;
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  sessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  onSelectExportProfile: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
  focusGenerateRequest: number;
  activeJobs: ActiveOpenRouterJob[];
  jobNotifications: Record<string, OpenRouterJobNotification>;
  generationNowMs: number;
  onTrackJob: (job: ActiveOpenRouterJob) => void;
  onCreateGenerationErrorSession: (args: {
    slotLabel: string;
    inputMode: InputMode;
    language: BenchmarkLanguageButton;
    message: string;
  }) => void;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
};
