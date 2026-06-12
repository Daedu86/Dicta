import { describe, expect, it, vi } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  createTtsPlaybackControls,
  type TtsPlaybackControlsOptions,
} from '../src/app/useTtsPlaybackControls';
import type {
  ControlAction,
  TtsPacingMode,
} from '../src/types/dictation';
import type {
  SessionStatus,
  TtsStatus,
} from '../src/app/sessionTypes';

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

function createHarness(overrides: Partial<TtsPlaybackControlsOptions> = {}) {
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
    utterance: ref({ text: 'Hallo' } as SpeechSynthesisUtterance),
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

describe('createTtsPlaybackControls', () => {
  it('pauses by capturing the spoken word, cancelling TTS, clearing refs, and updating status', () => {
    const { calls, controls, refs, state } = createHarness();

    controls.pauseTts();

    expect(calls.estimateTtsSpokenWordIndex).toHaveBeenCalledTimes(1);
    expect(refs.pausedAt.current).toBe(7);
    expect(calls.cancelBrowserTts).toHaveBeenCalledTimes(1);
    expect(refs.utterance.current).toBeNull();
    expect(refs.chunkStart.current).toBeNull();
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('pause');
    expect(state.running).toBe(false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.status).toBe('paused');
  });

  it('resumes from a paused word by replaying from that word without browser resume telemetry', () => {
    const { calls, controls, refs } = createHarness();
    refs.pausedAt.current = 4;

    controls.resumeTts();

    expect(calls.playTtsFromWord).toHaveBeenCalledWith(4);
    expect(calls.resumeBrowserTts).not.toHaveBeenCalled();
    expect(calls.recordTtsTelemetryAction).not.toHaveBeenCalled();
  });

  it('resumes browser playback and initializes startedAt when no paused word exists', () => {
    const { calls, controls, refs, state } = createHarness({
      ttsStatus: 'paused',
    });
    refs.startedAt.current = null;

    controls.resumeTts();

    expect(calls.resumeBrowserTts).toHaveBeenCalledTimes(1);
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('resume');
    expect(refs.startedAt.current).toBe(1234);
    expect(state.running).toBe(true);
    expect(state.sessionStatus).toBe('running');
    expect(state.status).toBe('playing');
  });

  it('stops playback, resets runtime refs, and derives paused/ready status from practice and source text', () => {
    const { calls, controls, refs, state } = createHarness();

    controls.stopTtsPlayback('stop');

    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('stop');
    expect(calls.cancelBrowserTts).toHaveBeenCalledTimes(1);
    expect(refs.utterance.current).toBeNull();
    expect(refs.chunkStart.current).toBeNull();
    expect(refs.pausedAt.current).toBeNull();
    expect(refs.completed.current).toBe(0);
    expect(state.currentChunk).toBe('');
    expect(state.pacingMode).toBe('balanced');
    expect(state.speechRate).toBe(1);
    expect(state.running).toBe(false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.status).toBe('ready');
  });

  it('stops without action, keeps finished sessions finished, and idles when source text is empty', () => {
    const { calls, controls, state } = createHarness({
      isBrowserTtsSupported: () => false,
      ttsPracticeText: '',
      ttsText: '   ',
    });
    state.sessionStatus = 'finished';

    controls.stopTtsPlayback();

    expect(calls.recordTtsTelemetryAction).not.toHaveBeenCalled();
    expect(calls.cancelBrowserTts).not.toHaveBeenCalled();
    expect(state.sessionStatus).toBe('finished');
    expect(state.status).toBe('idle');
  });

  it('seeks while idle by clamping target word and publishing ready paused progress', () => {
    const { calls, controls, refs, state } = createHarness({
      ttsStatus: 'ready',
    });

    controls.seekTtsPlayback(0.5);

    expect(calls.cancelBrowserTts).toHaveBeenCalledTimes(1);
    expect(refs.pausedAt.current).toBeNull();
    expect(refs.completed.current).toBe(4);
    expect(refs.chunkStart.current).toBeNull();
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('seek');
    expect(calls.playTtsFromWord).not.toHaveBeenCalled();
    expect(state.status).toBe('ready');
    expect(state.running).toBe(false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.tick).toBe(1);
  });

  it('seeks while playing by replaying from the clamped target word', () => {
    const { calls, controls, refs } = createHarness({
      ttsStatus: 'playing',
    });

    controls.seekTtsPlayback(2);

    expect(refs.completed.current).toBe(9);
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('seek');
    expect(calls.playTtsFromWord).toHaveBeenCalledWith(9);
  });

  it('does not seek outside Browser TTS, without source text, after finish, or without transcript words', () => {
    const nonBrowser = createHarness({ activeInputMode: 'keyboard' });
    nonBrowser.controls.seekTtsPlayback(0.5);
    expect(nonBrowser.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();

    const noText = createHarness({ ttsHasText: false });
    noText.controls.seekTtsPlayback(0.5);
    expect(noText.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();

    const finished = createHarness({ activeSessionFinished: true });
    finished.controls.seekTtsPlayback(0.5);
    expect(finished.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();

    const noWords = createHarness({ ttsTranscriptWordCount: 0 });
    noWords.controls.seekTtsPlayback(0.5);
    expect(noWords.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();
  });
});
