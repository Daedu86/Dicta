import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import { buildOpenRouterDirectGenerationJobPlan } from './openRouterDirectGenerationJobPlan';
import type { OpenRouterDirectGenerationPreset } from './openRouterDirectGenerationPresets';
import { requestOpenRouterGenerationJob } from './openRouterGenerationJobRequest';
import type { UseOpenRouterDirectGenerationRunnerOptions } from './openRouterDirectGenerationRunnerTypes';

type RunOpenRouterDirectGenerationJobRequestArgs = Pick<
  UseOpenRouterDirectGenerationRunnerOptions,
  | 'sessions'
  | 'adaptiveBenchmarksByInputLanguage'
  | 'adaptiveSessionFeedbackByInputLanguage'
  | 'recentDictationSessionHints'
  | 'getAuthHeaders'
> & {
  model: string;
  preset: OpenRouterDirectGenerationPreset;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  generationStartedAt: string;
  topicContext?: string;
};

export async function runOpenRouterDirectGenerationJobRequest({
  model,
  preset,
  inputMode,
  language,
  sessions,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  recentDictationSessionHints,
  generationStartedAt,
  topicContext,
  getAuthHeaders,
}: RunOpenRouterDirectGenerationJobRequestArgs): Promise<ActiveOpenRouterJob> {
  const jobPlan = buildOpenRouterDirectGenerationJobPlan({
    model,
    preset,
    inputMode,
    language,
    sessions,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    recentDictationSessionHints,
    generationStartedAt,
    topicContext,
  });

  return requestOpenRouterGenerationJob({
    jobPlan,
    requestHeaders: getAuthHeaders(),
  });
}
