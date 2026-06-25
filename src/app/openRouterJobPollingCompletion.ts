import {
  extractOpenRouterJobText,
  isOpenRouterJobCanceledError,
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
} from '../core/openRouterJobs';
import {
  buildDictationScriptFromCompactChunks,
  normalizeOpenRouterScriptBuildPolicy,
  OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT,
  OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT,
  parseCompactOpenRouterChunksJson,
  type OpenRouterGenerationFormat,
} from '../core/adaptive/openRouterGenerationPrompt';
import {
  stripJsonFence,
  validateGeneratedScriptForTarget,
} from '../components/openrouter/openRouterViewHelpers';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import { asOpenRouterRecord, openRouterStringField } from '../core/openRouterJobRecordUtils';
import { formatOpenRouterGenerationDisplayLabel } from './openRouterGenerationFailurePolicy';
import type {
  MutableValueRef,
  OpenRouterJobPollingCallbacks,
  TrainingGenerationNoticesSetter,
} from './openRouterJobPollingTypes';
import type { FailTrackedOpenRouterJobOptions } from './openRouterJobPollingFailure';

export type HandleOpenRouterTerminalJobArgs = {
  callbacksRef: MutableValueRef<OpenRouterJobPollingCallbacks>;
  consumedOpenRouterJobIdsRef: MutableValueRef<Set<string>>;
  failTrackedJob: (
    trackedJob: ActiveOpenRouterJob,
    message: string,
    completedAt: string,
    options?: FailTrackedOpenRouterJobOptions,
  ) => void;
  job: OpenRouterJobResponse;
  setTrainingGenerationNotices: TrainingGenerationNoticesSetter;
  trackedJob: ActiveOpenRouterJob;
};

export function getOpenRouterJobCompletedAt(job: OpenRouterJobResponse): string {
  return job.completedAt || job.updatedAt || new Date().toISOString();
}

export function handleOpenRouterTerminalJob({
  callbacksRef,
  consumedOpenRouterJobIdsRef,
  failTrackedJob,
  job,
  setTrainingGenerationNotices,
  trackedJob,
}: HandleOpenRouterTerminalJobArgs): void {
  const completedAt = getOpenRouterJobCompletedAt(job);

  if (job.status === 'failed') {
    if (isOpenRouterJobCanceledError(job.error)) {
      setTrainingGenerationNotices((current) => ({
        ...current,
        [trackedJob.jobId]: {
          jobId: trackedJob.jobId,
          slotLabel: trackedJob.slotLabel,
          displayLabel: formatOpenRouterGenerationDisplayLabel(trackedJob.slotLabel),
          model: trackedJob.model,
          startedAt: trackedJob.startedAt,
          status: 'canceled',
          completedAt,
          error: job.error,
        },
      }));
      return;
    }
    failTrackedJob(trackedJob, job.error || 'OpenRouter job failed.', completedAt);
    return;
  }

  if (consumedOpenRouterJobIdsRef.current.has(trackedJob.jobId)) return;
  consumedOpenRouterJobIdsRef.current.add(trackedJob.jobId);

  const text = extractOpenRouterJobText(job.result);
  if (!text.trim()) {
    failTrackedJob(trackedJob, 'OpenRouter job finished without usable text.', completedAt);
    return;
  }

  const validation = validateOpenRouterJobGeneration(text, job, trackedJob);
  if (validation.ok) {
    callbacksRef.current.onGeneratedScript(validation.script, trackedJob);
    setTrainingGenerationNotices((current) => ({
      ...current,
      [trackedJob.jobId]: {
        jobId: trackedJob.jobId,
        slotLabel: trackedJob.slotLabel,
        displayLabel: formatOpenRouterGenerationDisplayLabel(trackedJob.slotLabel),
        model: trackedJob.model,
        startedAt: trackedJob.startedAt,
        status: 'succeeded',
        completedAt,
      },
    }));
    return;
  }

  const message = validation.errors.join(' ') || 'Generated script did not validate.';
  failTrackedJob(trackedJob, message, completedAt);
}

function validateOpenRouterJobGeneration(
  text: string,
  job: OpenRouterJobResponse,
  trackedJob: ActiveOpenRouterJob,
) {
  const generationFormat = readOpenRouterJobGenerationFormat(job, trackedJob);
  if (generationFormat !== OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT) {
    return validateGeneratedScriptForTarget(
      stripJsonFence(text),
      trackedJob.inputMode,
      trackedJob.language as BenchmarkLanguageButton,
    );
  }

  const compact = parseCompactOpenRouterChunksJson(text);
  if (compact.ok) {
    const policy = normalizeOpenRouterScriptBuildPolicy(readOpenRouterJobScriptBuildPolicy(job, trackedJob), {
      inputMode: trackedJob.inputMode,
      language: trackedJob.language,
      durationMinutes: trackedJob.durationMinutes,
      difficulty: trackedJob.targetDifficulty ?? 'normal',
    });
    const built = buildDictationScriptFromCompactChunks(compact.payload, policy);
    if (!built.ok) return built;
    return validateGeneratedScriptForTarget(
      JSON.stringify(built.script),
      trackedJob.inputMode,
      trackedJob.language as BenchmarkLanguageButton,
    );
  }

  const legacy = validateGeneratedScriptForTarget(
    stripJsonFence(text),
    trackedJob.inputMode,
    trackedJob.language as BenchmarkLanguageButton,
  );
  if (legacy.ok) return legacy;

  return {
    ok: false as const,
    script: null,
    errors: [
      `Compact chunks output did not validate: ${compact.errors.join(' ')}`,
      `Legacy DictationScript fallback did not validate: ${legacy.errors.join(' ')}`,
    ],
  };
}

function readOpenRouterJobGenerationFormat(
  job: OpenRouterJobResponse,
  trackedJob: ActiveOpenRouterJob,
): OpenRouterGenerationFormat {
  const resultFormat = normalizeGenerationFormat(openRouterStringField(asOpenRouterRecord(job.result), 'generationFormat'));
  if (resultFormat) return resultFormat;
  const requestFormat = normalizeGenerationFormat(openRouterStringField(asOpenRouterRecord(job.request), 'generationFormat'));
  if (requestFormat) return requestFormat;
  if (trackedJob.generationFormat) return trackedJob.generationFormat;
  return OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT;
}

function readOpenRouterJobScriptBuildPolicy(
  job: OpenRouterJobResponse,
  trackedJob: ActiveOpenRouterJob,
): unknown {
  const resultRecord = asOpenRouterRecord(job.result);
  if (resultRecord.scriptBuildPolicy) return resultRecord.scriptBuildPolicy;
  const requestRecord = asOpenRouterRecord(job.request);
  if (requestRecord.scriptBuildPolicy) return requestRecord.scriptBuildPolicy;
  return trackedJob.scriptBuildPolicy;
}

function normalizeGenerationFormat(value: string): OpenRouterGenerationFormat | null {
  if (value === OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT) return OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT;
  if (value === OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT) return OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT;
  return null;
}
