import type {
  ActiveOpenRouterJob,
  OpenRouterJobResponse,
} from '../core/openRouterJobs';
import type {
  OpenRouterDirectGenerationJobPlan,
} from './openRouterDirectGenerationJobPlan';

interface RequestOpenRouterGenerationJobArgs {
  jobPlan: OpenRouterDirectGenerationJobPlan;
  requestHeaders: Record<string, string>;
}

export async function requestOpenRouterGenerationJob({
  jobPlan,
  requestHeaders,
}: RequestOpenRouterGenerationJobArgs): Promise<ActiveOpenRouterJob> {
  const response = await fetch('/api/openrouter/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...requestHeaders },
    body: JSON.stringify(jobPlan.jobRequestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Generation request failed (${response.status}).`);
  }

  const payload = (await response.json()) as OpenRouterJobResponse;

  if (!payload.jobId) {
    throw new Error('OpenRouter job did not return an id.');
  }

  return {
    jobId: payload.jobId,
    ...jobPlan.activeJobDraft,
  };
}
