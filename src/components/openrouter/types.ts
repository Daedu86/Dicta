import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode } from '../../core/adaptive/types';
import type { OpenRouterDurationMinutes } from '../../core/adaptive/openRouterGenerationPrompt';
import type { SupportedLanguage } from '../../core/languages';
import type { StoredSession } from '../../app/sessionTypes';

export type OpenRouterJobNotification = {
  jobId: string;
  slotLabel: string;
  model: string;
  startedAt: string;
  status: 'running' | 'succeeded' | 'failed' | 'canceled';
  completedAt?: string;
  error?: string;
};

export type OpenRouterModelSummary = { id: string; name?: string; context_length?: number };

export type TrainingGenerationNotice = {
  jobId?: string;
  slotLabel: string;
  displayLabel: string;
  model: string;
  startedAt: string;
  status: 'running' | 'succeeded' | 'failed' | 'canceled';
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

export type OpenRouterDirectGenerationRequestOptions = {
  durationMinutes?: OpenRouterDurationMinutes;
  topicContext?: string;
  inputModeOverride?: InputMode;
  languageOverride?: BenchmarkLanguageButton;
};

export type OpenRouterRecentSessionHint = {
  title: string;
  opener: string;
};

export type OpenRouterGenerationUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

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
  sessions: StoredSession[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  sessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  recentDictationSessionHints: OpenRouterRecentSessionHint[];
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
  directGenerationDurationMinutes: OpenRouterDurationMinutes;
  onChangeDirectGenerationDurationMinutes: (durationMinutes: OpenRouterDurationMinutes) => void;
  isOnline: boolean;
  openRouterOfflineTitle: string;
  adaptiveOpenRouterBusy: boolean;
  topicOpenRouterBusy: boolean;
  onGenerateAdaptiveDirectSession: (options?: OpenRouterDirectGenerationRequestOptions) => void | Promise<void>;
  onGenerateTopicDirectSession: (options?: OpenRouterDirectGenerationRequestOptions) => void | Promise<void>;
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
};
