import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestOpenRouterGenerationJob } from '../src/app/openRouterGenerationJobRequest';
import type { OpenRouterDirectGenerationJobPlan } from '../src/app/openRouterDirectGenerationJobPlan';

const baseJobPlan: OpenRouterDirectGenerationJobPlan = {
  slotLabel: '1 minute · normal',
  displayLabel: '1 minute normal',
  prompt: 'Generate a short dictation exercise.',
  targetMaxTokens: 800,
  jobRequestBody: {
    model: 'openrouter/test-model',
    prompt: 'Generate a short dictation exercise.',
    maxTokens: 800,
    slotLabel: '1 minute · normal',
    inputMode: 'browser-tts',
    language: 'en',
    durationMinutes: 1,
    targetDifficulty: 'normal',
  },
  activeJobDraft: {
    model: 'openrouter/test-model',
    slotLabel: '1 minute · normal',
    inputMode: 'browser-tts',
    language: 'en',
    durationMinutes: 1,
    targetDifficulty: 'normal',
    promptMode: 'compact-adaptive-v2',
    promptCharacterCount: 36,
    promptApproximateTokenCount: 9,
    origin: 'direct-training',
    startedAt: '2026-06-14T12:00:00.000Z',
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requestOpenRouterGenerationJob', () => {
  it('posts the job request body and returns an active job', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ jobId: 'job-123', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const job = await requestOpenRouterGenerationJob({
      jobPlan: baseJobPlan,
      requestHeaders: { Authorization: 'Bearer test-token' },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/openrouter/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(baseJobPlan.jobRequestBody),
    });
    expect(job).toEqual({
      jobId: 'job-123',
      ...baseJobPlan.activeJobDraft,
    });
  });

  it('throws the response text when the job request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Invalid OpenRouter payload.', { status: 400 })),
    );

    await expect(
      requestOpenRouterGenerationJob({
        jobPlan: baseJobPlan,
        requestHeaders: {},
      }),
    ).rejects.toThrow('Invalid OpenRouter payload.');
  });

  it('throws when the job response does not include a job id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'queued' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      requestOpenRouterGenerationJob({
        jobPlan: baseJobPlan,
        requestHeaders: {},
      }),
    ).rejects.toThrow('OpenRouter job did not return an id.');
  });
});
