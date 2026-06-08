// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  addActiveOpenRouterJob,
  clearActiveOpenRouterJob,
  extractOpenRouterJobText,
  extractOpenRouterJobUsage,
  isOpenRouterJobTerminal,
  loadActiveOpenRouterJob,
  loadActiveOpenRouterJobs,
  OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
  removeActiveOpenRouterJob,
  type ActiveOpenRouterJob,
} from '../src/core/openRouterJobs';

describe('openRouterJobs', () => {
  it('extracts stored OpenRouter text from a normalized job result', () => {
    expect(extractOpenRouterJobText({ text: '  {"title":"ok"}  ' })).toBe('  {"title":"ok"}  ');
  });

  it('extracts text from a raw OpenRouter payload fallback', () => {
    expect(
      extractOpenRouterJobText({
        payload: {
          choices: [{ message: { content: '{"title":"from payload"}' } }],
        },
      }),
    ).toBe('{"title":"from payload"}');
  });

  it('extracts OpenRouter token usage from a job result payload', () => {
    expect(
      extractOpenRouterJobUsage({
        payload: {
          usage: {
            prompt_tokens: 910,
            completion_tokens: 2450,
            total_tokens: 3360,
          },
        },
      }),
    ).toEqual({
      promptTokens: 910,
      completionTokens: 2450,
      totalTokens: 3360,
    });
  });

  it('treats only succeeded and failed jobs as terminal', () => {
    expect(isOpenRouterJobTerminal('queued')).toBe(false);
    expect(isOpenRouterJobTerminal('running')).toBe(false);
    expect(isOpenRouterJobTerminal('succeeded')).toBe(true);
    expect(isOpenRouterJobTerminal('failed')).toBe(true);
  });

  it('persists multiple active OpenRouter jobs and removes them one at a time', () => {
    clearActiveOpenRouterJob();
    const easyJob: ActiveOpenRouterJob = {
      jobId: 'job-easy',
      model: 'openrouter/free',
      slotLabel: 'Easy direct session',
      inputMode: 'browser-tts',
      language: 'de',
      durationMinutes: 2,
      targetDifficulty: 'easy',
      promptMode: 'compact-adaptive-v2',
      promptCharacterCount: 3600,
      promptApproximateTokenCount: 900,
      startedAt: '2026-05-17T10:00:00.000Z',
    };
    const hardJob: ActiveOpenRouterJob = {
      ...easyJob,
      jobId: 'job-hard',
      slotLabel: 'Advanced direct session',
      targetDifficulty: 'hard',
      startedAt: '2026-05-17T10:00:01.000Z',
    };

    const activeJobs = addActiveOpenRouterJob(hardJob, addActiveOpenRouterJob(easyJob, []));
    expect(activeJobs.map((job) => job.jobId)).toEqual(['job-easy', 'job-hard']);
    expect(loadActiveOpenRouterJobs().map((job) => job.jobId)).toEqual(['job-easy', 'job-hard']);
    expect(loadActiveOpenRouterJob()?.jobId).toBe('job-easy');
    expect(loadActiveOpenRouterJob()?.promptMode).toBe('compact-adaptive-v2');
    expect(loadActiveOpenRouterJob()?.promptApproximateTokenCount).toBe(900);

    const remainingJobs = removeActiveOpenRouterJob('job-easy', activeJobs);
    expect(remainingJobs.map((job) => job.jobId)).toEqual(['job-hard']);
    expect(loadActiveOpenRouterJobs().map((job) => job.jobId)).toEqual(['job-hard']);
    clearActiveOpenRouterJob();
  });

  it('restores supported legacy job metadata while ignoring removed Input 4 jobs', () => {
    clearActiveOpenRouterJob();
    window.localStorage.setItem(
      OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
      JSON.stringify([
        {
          jobId: 'job-legacy',
          model: 'openrouter/free',
          slotLabel: 'Express easy direct session',
          inputMode: 'browser-tts',
          language: 'fr',
          durationMinutes: 1,
          startedAt: '2026-05-17T10:00:00.000Z',
        },
        {
          jobId: 'job-removed-input4',
          model: 'openrouter/free',
          slotLabel: 'Removed Input 4 job',
          inputMode: 'qwen-cloud',
          language: 'pt',
          durationMinutes: 4,
          promptMode: 'compact-adaptive',
          promptCharacterCount: 4200,
          promptApproximateTokenCount: 1050,
          origin: 'custom-workspace',
          customSlotId: 'prompt2',
          startedAt: '2026-05-17T10:01:00.000Z',
        },
      ]),
    );

    const restoredJobs = loadActiveOpenRouterJobs();
    expect(restoredJobs).toHaveLength(1);
    expect(restoredJobs[0]).toMatchObject({
      jobId: 'job-legacy',
      inputMode: 'browser-tts',
      language: 'fr',
      durationMinutes: 1,
    });
    expect(restoredJobs[0]).not.toHaveProperty('origin');
    expect(restoredJobs[0]).not.toHaveProperty('customSlotId');
    clearActiveOpenRouterJob();
  });
});
