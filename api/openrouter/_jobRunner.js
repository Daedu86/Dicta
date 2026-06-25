import { auditOpenRouterJobEvent } from './_jobAudit.js';
import {
  formatOpenRouterJobProviderError,
  postChatCompletionWithSelectedModelRetries,
  readOpenRouterApiKey,
} from './_jobProvider.js';
import {
  markOpenRouterJobFailed,
  markOpenRouterJobRunning,
  markOpenRouterJobSucceeded,
} from './_jobPersistence.js';
import {
  formatOpenRouterJobTimeoutError,
  OPENROUTER_JOB_TIMEOUT_MS,
} from './_jobTimeout.js';

export {
  formatOpenRouterJobStaleError,
  formatOpenRouterJobTimeoutError,
  OPENROUTER_JOB_STALE_AFTER_MS,
  OPENROUTER_JOB_TIMEOUT_MS,
} from './_jobTimeout.js';

function buildSucceededJobResult(response, requestPayload) {
  return {
    text: response.scriptText,
    payload: response.payload,
    model: response.model || requestPayload.model,
    requestedModel: requestPayload.model,
    contentType: response.contentType,
    attempts: response.attempts,
    generationFormat: response.generationFormat || requestPayload.generationFormat || 'dictation-script-v1',
    ...(requestPayload.scriptBuildPolicy ? { scriptBuildPolicy: requestPayload.scriptBuildPolicy } : {}),
    jsonRepairApplied: response.jsonRepairApplied === true,
  };
}

function classifyOpenRouterJobError(error, message) {
  const statusCode = Number(error?.statusCode);
  const isTimeout = error?.name === 'AbortError' || message.toLowerCase().includes('aborted');
  const eventType = isTimeout
    ? 'openrouter_job_timeout'
    : error?.providerError === true
      ? 'openrouter_job_provider_error'
      : 'openrouter_job_failed';

  return {
    eventType,
    isTimeout,
    statusCode: isTimeout ? 504 : Number.isFinite(statusCode) ? statusCode : null,
  };
}

export async function runOpenRouterJob({ req, supabase, requester, profileId, jobId, requestPayload }) {
  const runningJob = await markOpenRouterJobRunning(supabase, {
    profileId,
    jobId,
    now: new Date().toISOString(),
  });
  if (!runningJob) return;

  try {
    const response = await postChatCompletionWithSelectedModelRetries({
      apiKey: readOpenRouterApiKey(),
      req,
      model: requestPayload.model,
      prompt: requestPayload.prompt,
      maxTokens: requestPayload.maxTokens,
      timeoutMs: OPENROUTER_JOB_TIMEOUT_MS,
      generationFormat: requestPayload.generationFormat,
    });
    if (!response.ok) {
      throw Object.assign(new Error(formatOpenRouterJobProviderError(response, response.attempts)), {
        statusCode: response.status,
        providerError: true,
        providerAttempts: response.attempts,
      });
    }

    if (!response.scriptText?.trim()) throw new Error('OpenRouter returned no valid generation JSON.');

    await markOpenRouterJobSucceeded(supabase, {
      profileId,
      jobId,
      result: buildSucceededJobResult(response, requestPayload),
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'OpenRouter job failed.';
    const { eventType, isTimeout, statusCode } = classifyOpenRouterJobError(error, rawMessage);
    const message = isTimeout
      ? formatOpenRouterJobTimeoutError(requestPayload.model)
      : rawMessage;
    await auditOpenRouterJobEvent(supabase, eventType, requester, {
      statusCode,
      severity: 'error',
      model: requestPayload.model,
      reason: message,
      metadata: { jobId, attempts: error?.providerAttempts ?? [] },
    });
    await markOpenRouterJobFailed(supabase, {
      profileId,
      jobId,
      error: message,
      completedAt: new Date().toISOString(),
    });
  }
}
