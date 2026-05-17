// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  addActiveOpenRouterJob,
  clearActiveOpenRouterJob,
  extractOpenRouterJobText,
  isOpenRouterJobTerminal,
  loadActiveOpenRouterJob,
  loadActiveOpenRouterJobs,
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

    const remainingJobs = removeActiveOpenRouterJob('job-easy', activeJobs);
    expect(remainingJobs.map((job) => job.jobId)).toEqual(['job-hard']);
    expect(loadActiveOpenRouterJobs().map((job) => job.jobId)).toEqual(['job-hard']);
    clearActiveOpenRouterJob();
  });
});
