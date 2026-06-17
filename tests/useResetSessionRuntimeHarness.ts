import type { MutableRefObject } from 'react';
import { vi } from 'vitest';
import type { ControlAction, SessionTelemetry } from '../src/types/dictation';
import type { StoredSession, TtsPublishedUiState } from '../src/app/sessionTypes';
import { createResetSessionRuntime } from '../src/app/useResetSessionRuntime';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

type ResetSessionRuntimeOptions = Parameters<typeof createResetSessionRuntime>[0];

function ref<T>(current: T): MutableRefObject<T> {
  return { current };
}

function setter() {
  return vi.fn();
}

function createFinishedSession(): StoredSession {
  return {
    id: 'session-1',
    status: 'finished',
  } as StoredSession;
}

export function createResetSessionHarness(overrides: Partial<ResetSessionRuntimeOptions> = {}) {
  const setTtsPracticeText = vi.fn();
  const stopTtsPlayback = vi.fn();
  const resetAdaptiveSessionFeedbackTracking = vi.fn();
  const options = {
    activeSession: createFinishedSession(),
    activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: true,
    ttsText: 'Hallo Welt',
    stopTtsPlayback,
    resetAdaptiveSessionFeedbackTracking,
    allowFinishedSessionResetRef: ref<string | null>(null),
    ttsPracticeLiveTextRef: ref('typed attempt'),
    ttsStartedAtMsRef: ref<number | null>(123),
    ttsChunkStartMsRef: ref<number | null>(456),
    ttsChunkStartWordIndexRef: ref(7),
    ttsChunkWordCountRef: ref(8),
    ttsCompletedSourceWordsRef: ref(9),
    ttsLastControllerActionRef: ref<ControlAction>('speed_up'),
    ttsUiLastPublishedAtRef: ref(999),
    ttsPublishedUiRef: ref<TtsPublishedUiState>({
      controllerState: 'slow_down',
      rate: 0.8,
      lagSec: 2,
      lagWords: 4,
      wpm: 80,
      accuracy: 70,
      trend: 'down',
    }),
    telemetryRef: ref<SessionTelemetry | null>({
      startedAt: '2026-01-01T00:00:00.000Z',
      chunks: [],
      actions: [],
    } as SessionTelemetry),
    setTtsPracticeText,
    setTtsStatus: setter(),
    setTtsCurrentChunk: setter(),
    setTtsPacingMode: setter(),
    setTtsSpeechRate: setter(),
    setRunning: setter(),
    setRate: setter(),
    setLagSec: setter(),
    setLagWords: setter(),
    setWpm: setter(),
    setAccuracy: setter(),
    setControllerState: setter(),
    setSessionStatus: setter(),
    setTrainingSubmitMessage: setter(),
    setInputSettingsLocked: setter(),
    ...overrides,
  } as ResetSessionRuntimeOptions;

  return {
    options,
    resetSession: createResetSessionRuntime(options),
    stopTtsPlayback,
    resetAdaptiveSessionFeedbackTracking,
    setTtsPracticeText,
  };
}
