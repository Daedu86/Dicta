import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createDefaultTtsPublishedUiState } from '../src/app/activeSessionHydration';
import {
  createResetSessionRuntime,
  type ResetSessionRuntimeOptions,
} from '../src/app/useResetSessionRuntime';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import type {
  ControlAction,
  SessionTelemetry,
  TtsPacingMode,
} from '../src/types/dictation';
import type {
  SessionStatus,
  StoredSession,
  TtsPublishedUiState,
  TtsStatus,
} from '../src/app/sessionTypes';

function ref<T>(current: T): MutableRefObject<T> {
  return { current };
}

function setter<T>() {
  return vi.fn() as unknown as Dispatch<SetStateAction<T>>;
}

function createFinishedSession(): StoredSession {
  return {
    id: 'session-1',
    status: 'finished',
  } as StoredSession;
}

function createHarness(overrides: Partial<ResetSessionRuntimeOptions> = {}) {
  const setTtsPracticeText = vi.fn() as unknown as Dispatch<SetStateAction<string>>;
  const stopTtsPlayback = vi.fn();
  const resetAdaptiveSessionFeedbackTracking = vi.fn();
  const options: ResetSessionRuntimeOptions = {
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
    setTtsStatus: setter<TtsStatus>(),
    setTtsCurrentChunk: setter<string>(),
    setTtsPacingMode: setter<TtsPacingMode>(),
    setTtsSpeechRate: setter<number>(),
    setRunning: setter<boolean>(),
    setRate: setter<number>(),
    setLagSec: setter<number>(),
    setLagWords: setter<number>(),
    setWpm: setter<number>(),
    setAccuracy: setter<number>(),
    setControllerState: setter<ControlAction>(),
    setSessionStatus: setter<SessionStatus>(),
    setTrainingSubmitMessage: setter<string>(),
    setInputSettingsLocked: setter<boolean>(),
    ...overrides,
  };

  return {
    options,
    resetSession: createResetSessionRuntime(options),
    stopTtsPlayback,
    resetAdaptiveSessionFeedbackTracking,
    setTtsPracticeText,
  };
}

describe('reset session runtime', () => {
  it('resets runtime refs and visible state after stopping playback', () => {
    const {
      options,
      resetSession,
      stopTtsPlayback,
      resetAdaptiveSessionFeedbackTracking,
      setTtsPracticeText,
    } = createHarness();

    resetSession();

    expect(options.allowFinishedSessionResetRef.current).toBe('session-1');
    expect(stopTtsPlayback).toHaveBeenCalledTimes(1);
    expect(stopTtsPlayback.mock.invocationCallOrder[0]).toBeLessThan(setTtsPracticeText.mock.invocationCallOrder[0]);
    expect(setTtsPracticeText).toHaveBeenCalledWith('');
    expect(options.setTtsStatus).toHaveBeenCalledWith('ready');
    expect(options.setTtsCurrentChunk).toHaveBeenCalledWith('');
    expect(options.setTtsPacingMode).toHaveBeenCalledWith('balanced');
    expect(options.setTtsSpeechRate).toHaveBeenCalledWith(1);
    expect(options.setRunning).toHaveBeenCalledWith(false);
    expect(options.setRate).toHaveBeenCalledWith(1);
    expect(options.setLagSec).toHaveBeenCalledWith(0);
    expect(options.setLagWords).toHaveBeenCalledWith(0);
    expect(options.setWpm).toHaveBeenCalledWith(0);
    expect(options.setAccuracy).toHaveBeenCalledWith(100);
    expect(options.setControllerState).toHaveBeenCalledWith('hold');
    expect(options.setSessionStatus).toHaveBeenCalledWith('ready');
    expect(options.setTrainingSubmitMessage).toHaveBeenCalledWith('');
    expect(options.setInputSettingsLocked).toHaveBeenCalledWith(false);
    expect(options.ttsPracticeLiveTextRef.current).toBe('');
    expect(options.ttsStartedAtMsRef.current).toBeNull();
    expect(options.ttsChunkStartMsRef.current).toBeNull();
    expect(options.ttsChunkStartWordIndexRef.current).toBe(0);
    expect(options.ttsChunkWordCountRef.current).toBe(0);
    expect(options.ttsCompletedSourceWordsRef.current).toBe(0);
    expect(options.ttsLastControllerActionRef.current).toBe('hold');
    expect(options.ttsUiLastPublishedAtRef.current).toBe(0);
    expect(options.ttsPublishedUiRef.current).toEqual(createDefaultTtsPublishedUiState());
    expect(options.telemetryRef.current).toBeNull();
    expect(resetAdaptiveSessionFeedbackTracking).toHaveBeenCalledWith('session-1');
  });

  it('preserves the input settings lock only when requested', () => {
    const { options, resetSession } = createHarness({
      inputSettingsLocked: true,
    });

    resetSession({ preserveInputSettingsLock: true });

    expect(options.setInputSettingsLocked).toHaveBeenCalledWith(true);
  });

  it('does not arm the finished-session reset allowance for unfinished sessions', () => {
    const { options, resetSession } = createHarness({
      activeSession: {
        id: 'session-2',
        status: 'running',
      } as StoredSession,
    });

    resetSession();

    expect(options.allowFinishedSessionResetRef.current).toBeNull();
    expect(options.resetAdaptiveSessionFeedbackTracking).toHaveBeenCalledWith('session-2');
  });
});
