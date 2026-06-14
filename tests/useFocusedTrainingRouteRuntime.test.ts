/**
 * @vitest-environment jsdom
 */

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  useFocusedTrainingRouteRuntime,
  type UseFocusedTrainingRouteRuntimeArgs,
  type UseFocusedTrainingRouteRuntimeResult,
} from '../src/app/useFocusedTrainingRouteRuntime';
import type { StoredSession } from '../src/app/sessionTypes';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function createSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    name: 'Focused session',
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-14T00:00:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: false,
    ttsText: 'eins zwei drei vier',
    ttsLanguage: 'de',
    ttsPracticeText: 'typed text',
    difficulty: 'normal',
    status: 'ready',
    metrics: {
      controllerState: 'hold',
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 100,
      trend: 'stable',
      score: 0,
      points: 0,
    },
    telemetry: {
      startedAt: '',
      lagSeries: [],
      wpmSeries: [],
      accuracySeries: [],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    },
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    createdDeviceKind: 'desktop',
    dictationScript: null,
    ...overrides,
  };
}

function createDefaultArgs(
  overrides: Partial<UseFocusedTrainingRouteRuntimeArgs> = {},
): UseFocusedTrainingRouteRuntimeArgs {
  const activeSession = createSession();

  return {
    activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    activeSession,
    activeTrainingSubmissionMeta: null,
    activeInputLabel: 'Input # 2 - Text to Speech (TTS)',
    sessionStatus: 'ready',
    ttsStatus: 'ready',
    running: false,
    inputSettingsLocked: false,
    activeVisibleScore: 91,
    activeLiveScoreHelpText: 'score help',
    activeLivePointsLabel: '9/10 pts',
    activeLivePointsHelpText: 'points help',
    activeVisibleAccuracy: 97.5,
    activeLiveAccuracyHelpText: 'accuracy help',
    lagSec: 0.33,
    activeSessionFinished: false,
    ttsHasText: true,
    error: '',
    trainingSubmitMessage: '',
    exportMessage: '',
    openRouterJobStatus: '',
    openRouterError: '',
    ttsTranscript: {
      words: [
        { word: 'eins', start: 0, end: 1 },
        { word: 'zwei', start: 1, end: 2 },
        { word: 'drei', start: 2, end: 3 },
        { word: 'vier', start: 3, end: 4 },
      ],
    },
    estimateTtsSpokenWordIndex: vi.fn(() => 2),
    ttsSpeechRate: 1,
    ttsLanguage: 'de',
    adaptiveSemanticDebug: {
      semanticCutPenalty: 0,
      unsafePauseCount: 0,
      safePauseCount: 0,
      deferredPauseCount: 0,
      replayDeniedByBoundaryCount: 0,
      averageSemanticCompleteness: 1,
      averagePhraseDifficulty: 0,
      inputExecutionFidelityScore: 1,
      currentPhraseIndex: 0,
      currentPhraseId: '',
      currentPhraseTextPreview: '',
      totalSemanticPhrases: 0,
      phraseAdvanceCount: 0,
      phraseReplayCount: 0,
      lastPhraseAdvanceReason: '',
    },
    ttsPracticeText: 'typed text',
    ttsPlayerProgressTick: 0,
    seekTtsPlayback: vi.fn(),
    resetSession: vi.fn(),
    playTts: vi.fn(),
    resumeTts: vi.fn(),
    pauseTts: vi.fn(),
    stopTtsPlayback: vi.fn(),
    onTtsPracticeChange: vi.fn(),
    onTtsPracticeKeyDown: vi.fn(),
    submitTtsSession: vi.fn(),
    setInputSettingsLocked: vi.fn(),
    setError: vi.fn(),
    setExportMessage: vi.fn(),
    telemetryRef: { current: null },
    ttsStartedAtMsRef: { current: null },
    ttsPracticeLiveTextRef: { current: 'typed text' },
    pendingSessions: [],
    activeSessionId: activeSession.id,
    openWorkspaceForSession: vi.fn(),
    deleteSession: vi.fn(),
    supabaseSyncStatus: {
      enabled: false,
      state: 'disabled',
      message: '',
      lastSyncedAt: null,
      imported: 0,
      pushed: 0,
    },
    pendingSyncSummary: {
      count: 0,
      hasPending: false,
    },
    allowCustomSessionGeneration: true,
    openRouterAccessAllowed: true,
    isOnline: true,
    effectiveOpenRouterDefaultModel: 'test-model',
    sessionQuotaStatus: {
      blocked: false,
      message: '',
    },
    openRouterOfflineTitle: '',
    activeOpenRouterJobs: [],
    openRouterJobNotifications: {},
    trainingGenerationNotices: {},
    trainingGenerationNowMs: 0,
    directOpenRouterBusy: false,
    directIntermediateOpenRouterBusy: false,
    directAdvancedOpenRouterBusy: false,
    expressEasyOpenRouterBusy: false,
    expressIntermediateOpenRouterBusy: false,
    expressAdvancedOpenRouterBusy: false,
    generateEasyNextSessionFromOpenRouter: vi.fn(),
    generateIntermediateNextSessionFromOpenRouter: vi.fn(),
    generateAdvancedNextSessionFromOpenRouter: vi.fn(),
    generateExpressEasyNextSessionFromOpenRouter: vi.fn(),
    generateExpressIntermediateNextSessionFromOpenRouter: vi.fn(),
    generateExpressAdvancedNextSessionFromOpenRouter: vi.fn(),
    openOpenRouterGenerateForActiveInput: vi.fn(),
    ...overrides,
  };
}

function TestHarness({
  args,
  onRuntime,
}: {
  args: UseFocusedTrainingRouteRuntimeArgs;
  onRuntime: (runtime: UseFocusedTrainingRouteRuntimeResult) => void;
}) {
  const runtime = useFocusedTrainingRouteRuntime(args);

  useEffect(() => {
    onRuntime(runtime);
  }, [runtime, onRuntime]);

  return null;
}

async function renderFocusedTrainingRouteRuntime(
  overrides: Partial<UseFocusedTrainingRouteRuntimeArgs> = {},
): Promise<{
  args: UseFocusedTrainingRouteRuntimeArgs;
  runtime: UseFocusedTrainingRouteRuntimeResult;
}> {
  const args = createDefaultArgs(overrides);
  let renderedRuntime: UseFocusedTrainingRouteRuntimeResult | null = null;

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(TestHarness, {
      args,
      onRuntime: (runtime) => {
        renderedRuntime = runtime;
      },
    }));
  });

  if (!renderedRuntime) {
    throw new Error('useFocusedTrainingRouteRuntime did not render.');
  }

  return {
    args,
    runtime: renderedRuntime,
  };
}

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }

  root = null;
  container?.remove();
  container = null;
  vi.clearAllMocks();
});

describe('useFocusedTrainingRouteRuntime', () => {
  it('returns focusedTrainingProps for the TrainingView route', async () => {
    const { runtime } = await renderFocusedTrainingRouteRuntime();

    expect(runtime.focusedTrainingProps.activeSession?.id).toBe('session-1');
    expect(runtime.focusedTrainingProps.currentTextValue).toBe('typed text');
    expect(runtime.focusedTrainingProps.liveScoreLabel).toBe('91');
    expect(runtime.focusedTrainingProps.liveAccuracyLabel).toBe('97.5%');
    expect(runtime.focusedTrainingProps.progressLabel).toBe('Word 2/4');
  });

  it('connects focused training controls', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    act(() => {
      runtime.focusedTrainingProps.onPlay();
      runtime.focusedTrainingProps.onPause('edited text');
      runtime.focusedTrainingProps.onStop('stopped text');
      runtime.focusedTrainingProps.onSubmit('submitted text');
    });

    expect(args.playTts).toHaveBeenCalledTimes(1);
    expect(args.onTtsPracticeChange).toHaveBeenNthCalledWith(1, 'edited text');
    expect(args.pauseTts).toHaveBeenCalledTimes(1);
    expect(args.onTtsPracticeChange).toHaveBeenNthCalledWith(2, 'stopped text');
    expect(args.stopTtsPlayback).toHaveBeenCalledWith('stop');
    expect(args.submitTtsSession).toHaveBeenCalledWith('submitted text');
  });

  it('connects generation buttons', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    expect(runtime.focusedTrainingProps.generationButtons.map((button) => button.id)).toEqual([
      'easy',
      'express-easy',
      'medium',
      'express-medium',
      'hard',
      'express-hard',
      'custom',
    ]);

    const easyButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'easy');
    const customButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'custom');

    act(() => {
      easyButton?.onClick();
      customButton?.onClick();
    });

    expect(args.generateEasyNextSessionFromOpenRouter).toHaveBeenCalledTimes(1);
    expect(args.openOpenRouterGenerateForActiveInput).toHaveBeenCalledTimes(1);
  });

  it('replays focused TTS from the current progress minus the rewind buffer', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    act(() => {
      runtime.focusedTrainingProps.onReplay();
    });

    expect(args.seekTtsPlayback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(args.seekTtsPlayback).mock.calls[0][0]).toBeCloseTo(0.42);
  });
});
