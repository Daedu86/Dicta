// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenRouterJobsRuntime } from '../src/app/useOpenRouterJobsRuntime';
import {
  clearActiveOpenRouterJob,
  loadActiveOpenRouterJobs,
  type ActiveOpenRouterJob,
} from '../src/core/openRouterJobs';
import type { DictationScript } from '../src/core/adaptive/dictationScriptValidation';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

type RuntimeSnapshot = ReturnType<typeof useOpenRouterJobsRuntime>;

const validBrowserTtsDeScript: DictationScript = {
  title: 'Generated German Dictation',
  language: 'de',
  inputMode: 'browser-tts',
  difficulty: 'normal',
  estimatedDurationSec: 90,
  targetSkills: [],
  recommendedRateRange: [0.9, 1],
  recommendedPhraseSize: 'medium',
  recommendedPauseMs: 600,
  phrases: [
    {
      id: 'p01',
      text: 'Dies ist der erste Satz.',
      boundaryType: 'sentence',
      pauseAfterMs: 600,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.9,
      difficulty: 0.4,
      emphasisWords: [],
      intonationHint: 'falling',
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  clearActiveOpenRouterJob();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  clearActiveOpenRouterJob();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function flushReactWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useOpenRouterJobsRuntime', () => {
  it('polls a terminal successful job, hands off the validated script, and clears active job storage', async () => {
    const generatedScripts: Array<{ script: DictationScript; job: ActiveOpenRouterJob }> = [];
    const errors: string[] = [];
    const errorSessions: Array<{ job: ActiveOpenRouterJob; message: string }> = [];
    let runtime: RuntimeSnapshot | null = null;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'job-1',
        status: 'succeeded',
        result: { text: JSON.stringify(validBrowserTtsDeScript) },
        completedAt: '2026-06-04T13:00:00.000Z',
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    function Harness() {
      runtime = useOpenRouterJobsRuntime({
        localStorageReady: true,
        openRouterAccessAllowed: true,
        getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
        onOpenRouterError: (message) => errors.push(message),
        onCreateGenerationErrorSession: (job, message) => errorSessions.push({ job, message }),
        onGeneratedScript: (script, job) => generatedScripts.push({ script, job }),
      });
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });

    const activeJob: ActiveOpenRouterJob = {
      jobId: 'job-1',
      model: 'openrouter/free',
      slotLabel: 'Easy direct session',
      inputMode: 'browser-tts',
      language: 'de',
      durationMinutes: 2,
      targetDifficulty: 'easy',
      origin: 'direct-training',
      startedAt: '2026-06-04T12:59:00.000Z',
    };

    await act(async () => {
      runtime?.trackOpenRouterJob(activeJob);
    });
    await flushReactWork();
    await flushReactWork();

    expect(fetchMock).toHaveBeenCalledWith('/api/openrouter/jobs?id=job-1', {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(generatedScripts).toHaveLength(1);
    expect(generatedScripts[0]?.script.title).toBe('Generated German Dictation');
    expect(generatedScripts[0]?.job.jobId).toBe('job-1');
    expect(errorSessions).toEqual([]);
    expect(errors).toEqual([]);
    expect(loadActiveOpenRouterJobs()).toEqual([]);
    expect(runtime?.activeOpenRouterJobs).toEqual([]);
    expect(runtime?.trainingGenerationNotices['job-1']).toMatchObject({
      jobId: 'job-1',
      status: 'succeeded',
      completedAt: '2026-06-04T13:00:00.000Z',
    });
  });

  it('cancels an active job, clears active storage, and records a canceled notice', async () => {
    const errors: string[] = [];
    let runtime: RuntimeSnapshot | null = null;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'job-cancel',
        status: 'failed',
        error: 'Canceled by user.',
        completedAt: '2026-06-04T13:01:00.000Z',
      }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    function Harness() {
      runtime = useOpenRouterJobsRuntime({
        localStorageReady: false,
        openRouterAccessAllowed: true,
        getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
        onOpenRouterError: (message) => errors.push(message),
        onCreateGenerationErrorSession: vi.fn(),
        onGeneratedScript: vi.fn(),
      });
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });

    const activeJob: ActiveOpenRouterJob = {
      jobId: 'job-cancel',
      model: 'openrouter/free',
      slotLabel: 'Adaptive direct session',
      inputMode: 'browser-tts',
      language: 'de',
      durationMinutes: 6,
      origin: 'direct-training',
      startedAt: '2026-06-04T13:00:00.000Z',
    };

    await act(async () => {
      runtime?.trackOpenRouterJob(activeJob);
    });

    await act(async () => {
      await runtime?.cancelOpenRouterJob('job-cancel');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/openrouter/jobs?id=job-cancel', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(loadActiveOpenRouterJobs()).toEqual([]);
    expect(runtime?.openRouterJobNotifications['job-cancel']).toMatchObject({ status: 'canceled' });
    expect(runtime?.trainingGenerationNotices['job-cancel']).toMatchObject({
      jobId: 'job-cancel',
      status: 'canceled',
      completedAt: '2026-06-04T13:01:00.000Z',
    });
    expect(errors).toEqual([]);
  });
});
