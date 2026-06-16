import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';
import {
  useFocusedTrainingRouteRuntime,
  type UseFocusedTrainingRouteRuntimeArgs,
  type UseFocusedTrainingRouteRuntimeResult,
} from '../../src/app/useFocusedTrainingRouteRuntime';
import type { StoredSession } from '../../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../src/core/sessionInputModes';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

export function createFocusedTrainingSession(overrides: Partial<StoredSession> = {}): StoredSession {
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

export function createFocusedTrainingRouteRuntimeArgs(
  overrides: Partial<UseFocusedTrainingRouteRuntimeArgs> = {},
): UseFocusedTrainingRouteRuntimeArgs {
  const activeSession = createFocusedTrainingSession();

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
    generateEasyNextSessionFromOpenRouter: vi.fn(),
    generateIntermediateNextSessionFromOpenRouter: vi.fn(),
    generateAdvancedNextSessionFromOpenRouter: vi.fn(),
    ...overrides,
  };
}

function FocusedTrainingRouteRuntimeHarness({
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

export async function renderFocusedTrainingRouteRuntime(
  overrides: Partial<UseFocusedTrainingRouteRuntimeArgs> = {},
): Promise<{
  args: UseFocusedTrainingRouteRuntimeArgs;
  runtime: UseFocusedTrainingRouteRuntimeResult;
}> {
  const args = createFocusedTrainingRouteRuntimeArgs(overrides);
  let renderedRuntime: UseFocusedTrainingRouteRuntimeResult | null = null;

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(FocusedTrainingRouteRuntimeHarness, {
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

export async function cleanupFocusedTrainingRouteRuntimeHarness(): Promise<void> {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }

  root = null;
  container?.remove();
  container = null;
  vi.clearAllMocks();
}
