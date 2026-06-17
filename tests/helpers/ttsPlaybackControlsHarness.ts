import { vi } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../src/core/sessionInputModes';
import {
  createTtsPlaybackControls,
  type TtsPlaybackControlsOptions,
} from '../../src/app/useTtsPlaybackControls';
import type { TtsPacingMode } from '../../src/types/dictation';
import type { SessionStatus, TtsStatus } from '../../src/app/sessionTypes';

type Ref<T> = {
  current: T;
};

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

function ref<T>(current: T): Ref<T> {
  return { current };
}

function resolveSet<T>(value: T | ((current: T) => T), current: T): T {
  return typeof value === 'function'
    ? (value as (current: T) => T)(current)
    : value;
}

export function createTtsPlaybackControlsHarness(
  overrides: Partial<TtsPlaybackControlsOptions> = {},
) {
  const state = {
    currentChunk: 'current chunk',
    pacingMode: 'flow' as TtsPacingMode,
    running: true,
    sessionStatus: 'running' as SessionStatus,
    speechRate: 1.24,
    status: 'playing' as TtsStatus,
    tick: 0,
  };
  const refs = {
    completed: ref(3),
    chunkStart: ref<number | null>(500),
    pausedAt: ref<number | null>(null),
    startedAt: ref<number | null>(100),
    utterance: ref({ text: 'Hallo' } as SpeechSynthesisUtterance | null),
  };
  const calls = {
    cancelBrowserTts: vi.fn(),
    estimateTtsSpokenWordIndex: vi.fn(() => 7),
    isBrowserTtsSupported: vi.fn(() => true),
    playTtsFromWord: vi.fn(),
    recordTtsTelemetryAction: vi.fn(),
    resumeBrowserTts: vi.fn(),
  };

  const options: TtsPlaybackControlsOptions = {
    activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    activeSessionFinished: false,
    ttsHasText: true,
    ttsStatus: state.status,
    ttsText: 'source text',
    ttsPracticeText: 'typed text',
    ttsTranscriptWordCount: 10,
    isBrowserTtsSupported: calls.isBrowserTtsSupported,
    cancelBrowserTts: calls.cancelBrowserTts,
    resumeBrowserTts: calls.resumeBrowserTts,
    estimateTtsSpokenWordIndex: calls.estimateTtsSpokenWordIndex,
    playTtsFromWord: calls.playTtsFromWord,
    recordTtsTelemetryAction: calls.recordTtsTelemetryAction,
    ttsStartedAtMsRef: refs.startedAt,
    ttsUtteranceRef: refs.utterance,
    ttsChunkStartMsRef: refs.chunkStart,
    ttsCompletedSourceWordsRef: refs.completed,
    ttsPausedAtWordIndexRef: refs.pausedAt,
    setTtsCurrentChunk: ((value) => {
      state.currentChunk = resolveSet(value, state.currentChunk);
    }) as StateSetter<string>,
    setTtsPacingMode: ((value) => {
      state.pacingMode = resolveSet(value, state.pacingMode);
    }) as StateSetter<TtsPacingMode>,
    setTtsSpeechRate: ((value) => {
      state.speechRate = resolveSet(value, state.speechRate);
    }) as StateSetter<number>,
    setRunning: ((value) => {
      state.running = resolveSet(value, state.running);
    }) as StateSetter<boolean>,
    setSessionStatus: ((value) => {
      state.sessionStatus = resolveSet(value, state.sessionStatus);
    }) as StateSetter<SessionStatus>,
    setTtsStatus: ((value) => {
      state.status = resolveSet(value, state.status);
    }) as StateSetter<TtsStatus>,
    setTtsPlayerProgressTick: ((value) => {
      state.tick = resolveSet(value, state.tick);
    }) as StateSetter<number>,
    nowMs: () => 1234,
    ...overrides,
  };

  return {
    calls,
    controls: createTtsPlaybackControls(options),
    refs,
    state,
  };
}
