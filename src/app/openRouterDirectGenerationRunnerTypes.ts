import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import type { OpenRouterDirectGenerationPreset } from './openRouterDirectGenerationPresets';
import type { StoredSession } from './sessionTypes';

export type RecentDictationSessionHint = {
  title: string;
  opener: string;
};

export type CreateGenerationErrorSessionArgs = {
  slotLabel: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  message: string;
};

export type UseOpenRouterDirectGenerationRunnerOptions = {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  openRouterAccessAllowed: boolean;
  openRouterAccessMessage: string;
  isOnline: boolean;
  effectiveOpenRouterDefaultModel: string;
  fallbackInputMode: InputMode;
  dictaLanguageView: BenchmarkLanguageButton;
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  recentDictationSessionHints: RecentDictationSessionHint[];
  getAuthHeaders: () => Record<string, string>;
  ensureCanCreateDictationSession: (messageTarget: 'error' | 'openrouter' | 'export') => boolean;
  setOpenRouterError: (message: string) => void;
  setSelectedBenchmarkInputMode: (inputMode: InputMode) => void;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  trackOpenRouterJob: (activeJob: ActiveOpenRouterJob) => void;
  recordOpenRouterGenerationFailure: (notice: {
    slotLabel: string;
    displayLabel: string;
    model: string;
    startedAt: string;
    error: string;
    completedAt?: string;
  }) => void;
  createOpenRouterErrorSession: (
    args: CreateGenerationErrorSessionArgs,
    options?: { navigateToLeaderboard?: boolean },
  ) => void;
};

export type GenerateOpenRouterDirectSessionOptions = OpenRouterDirectGenerationPreset & {
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};
