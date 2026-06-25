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

  it('polls a terminal compact chunks job and builds a complete DictationScript', async () => {
    const generatedScripts: Array<{ script: DictationScript; job: ActiveOpenRouterJob }> = [];
    const errors: string[] = [];
    let runtime: RuntimeSnapshot | null = null;

    const scriptBuildPolicy = {
      inputMode: 'browser-tts' as const,
      language: 'de',
      difficulty: 'normal' as const,
      durationMinutes: 5 as const,
      recommendedRateRange: [0.76, 0.8] as [number, number],
      recommendedPhraseSize: 'short' as const,
      recommendedPauseMs: 2600,
      phraseDifficultyRange: [0.45, 0.65] as [number, number],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'job-compact',
        status: 'succeeded',
        request: {
          generationFormat: 'compact-chunks-v1',
          scriptBuildPolicy,
        },
        result: {
          generationFormat: 'compact-chunks-v1',
          scriptBuildPolicy,
          text: JSON.stringify({
            title: 'Ruhige Beobachtungen',
            chunks: [
              'Am Morgen oeffnet die Baeckerei langsam ihre Tuer.',
              'Die ersten Nachbarn warten ruhig an der Haltestelle.',
            ],
          }),
        },
        completedAt: '2026-06-04T13:05:00.000Z',
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
        onCreateGenerationErrorSession: vi.fn(),
        onGeneratedScript: (script, job) => generatedScripts.push({ script, job }),
      });
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });

    const activeJob: ActiveOpenRouterJob = {
      jobId: 'job-compact',
      model: 'openrouter/free',
      slotLabel: 'Adaptive direct session',
      inputMode: 'browser-tts',
      language: 'de',
      durationMinutes: 5,
      targetDifficulty: 'normal',
      generationFormat: 'compact-chunks-v1',
      scriptBuildPolicy,
      origin: 'direct-training',
      startedAt: '2026-06-04T13:04:00.000Z',
    };

    await act(async () => {
      runtime?.trackOpenRouterJob(activeJob);
    });
    await flushReactWork();
    await flushReactWork();

    expect(generatedScripts).toHaveLength(1);
    expect(generatedScripts[0]?.script).toMatchObject({
      title: 'Ruhige Beobachtungen',
      inputMode: 'browser-tts',
      language: 'de',
      estimatedDurationSec: 300,
      recommendedPauseMs: 2600,
      recommendedPhraseSize: 'short',
    });
    expect(generatedScripts[0]?.script.phrases.length).toBeGreaterThan(0);
    expect(generatedScripts[0]?.script.phrases[0]).toMatchObject({
      id: 'p01',
      pauseAfterMs: 2600,
    });
    expect(errors).toEqual([]);
    expect(loadActiveOpenRouterJobs()).toEqual([]);
    expect(runtime?.trainingGenerationNotices['job-compact']).toMatchObject({
      jobId: 'job-compact',
      status: 'succeeded',
      completedAt: '2026-06-04T13:05:00.000Z',
    });
  });

  it('fails an invalid compact chunks job and clears active job storage', async () => {
    const errors: string[] = [];
    const errorSessions: Array<{ job: ActiveOpenRouterJob; message: string }> = [];
    let runtime: RuntimeSnapshot | null = null;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'job-invalid-compact',
        status: 'succeeded',
        result: {
          generationFormat: 'compact-chunks-v1',
          text: JSON.stringify({ title: 'No chunks', chunks: [] }),
        },
        completedAt: '2026-06-04T13:06:00.000Z',
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
        onGeneratedScript: vi.fn(),
      });
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });

    const activeJob: ActiveOpenRouterJob = {
      jobId: 'job-invalid-compact',
      model: 'openrouter/free',
      slotLabel: 'Adaptive direct session',
      inputMode: 'browser-tts',
      language: 'de',
      durationMinutes: 5,
      generationFormat: 'compact-chunks-v1',
      origin: 'direct-training',
      startedAt: '2026-06-04T13:04:00.000Z',
    };

    await act(async () => {
      runtime?.trackOpenRouterJob(activeJob);
    });
    await flushReactWork();
    await flushReactWork();

    expect(errors[0]).toContain('Compact chunks output did not validate');
    expect(errorSessions).toHaveLength(1);
    expect(loadActiveOpenRouterJobs()).toEqual([]);
    expect(runtime?.trainingGenerationNotices['job-invalid-compact']).toMatchObject({
      jobId: 'job-invalid-compact',
      status: 'failed',
      completedAt: '2026-06-04T13:06:00.000Z',
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
