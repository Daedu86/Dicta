// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deriveTrainingLifecycleState,
  useTrainingSessionLifecycle,
  type TrainingLifecycleInputMode,
  type TrainingLifecyclePlaybackStatus,
  type TrainingLifecycleSessionStatus,
  type TrainingLifecycleStateInput,
  type TrainingSessionLifecycle,
} from '../src/app/useTrainingSessionLifecycle';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.restoreAllMocks();
});

describe('deriveTrainingLifecycleState', () => {
  it('keeps TTS and Kokoro submit readiness separated by input mode', () => {
    expect(
      deriveTrainingLifecycleState(
        stateFixture({
          activeInputMode: 'input2',
          ttsHasText: true,
          kokoroHasText: false,
        }),
      ),
    ).toMatchObject({
      inputSettingsReady: true,
      canSubmitTtsSession: true,
      canSubmitKokoroSession: false,
    });

    expect(
      deriveTrainingLifecycleState(
        stateFixture({
          activeInputMode: 'input3',
          ttsHasText: true,
          kokoroHasText: true,
        }),
      ),
    ).toMatchObject({
      inputSettingsReady: true,
      canSubmitTtsSession: false,
      canSubmitKokoroSession: true,
    });
  });
});

describe('useTrainingSessionLifecycle', () => {
  it('routes paused TTS to resume, playing TTS to pause/stop, and submit to the TTS submit path', () => {
    const pausedCalls: string[] = [];
    const pausedLifecycle = renderLifecycle({
      state: stateFixture({
        activeInputMode: 'input2',
        ttsHasText: true,
        ttsStatus: 'paused',
      }),
      text: {
        ttsPracticeText: 'old tts',
        kokoroPracticeText: '',
      },
      calls: pausedCalls,
    });

    pausedLifecycle.focusedTrainingControls.onPlay();
    pausedLifecycle.focusedTrainingControls.onSubmit('submitted tts');

    expect(pausedLifecycle.focusedTrainingControls.playLabel).toBe('Resume');
    expect(pausedCalls).toEqual(['resumeTts', 'submitTts:submitted tts']);

    const playingCalls: string[] = [];
    const playingLifecycle = renderLifecycle({
      state: stateFixture({
        activeInputMode: 'input2',
        ttsHasText: true,
        ttsStatus: 'playing',
      }),
      text: {
        ttsPracticeText: 'old tts',
        kokoroPracticeText: '',
      },
      calls: playingCalls,
    });

    playingLifecycle.focusedTrainingControls.onPause('new tts');
    playingLifecycle.focusedTrainingControls.onStop('final tts');

    expect(playingCalls).toEqual(['ttsText:new tts', 'pauseTts', 'ttsText:final tts', 'stopTts:stop']);
  });

  it('routes Kokoro focused controls separately from TTS controls', () => {
    const calls: string[] = [];
    const lifecycle = renderLifecycle({
      state: stateFixture({
        activeInputMode: 'input3',
        kokoroHasText: true,
        kokoroStatus: 'paused',
      }),
      text: {
        ttsPracticeText: '',
        kokoroPracticeText: 'old kokoro',
      },
      calls,
    });

    lifecycle.focusedTrainingControls.onPlay();
    lifecycle.focusedTrainingControls.onSubmit('submitted kokoro');

    expect(lifecycle.focusedTrainingControls.canSubmit).toBe(true);
    expect(lifecycle.focusedTrainingControls.playLabel).toBe('Resume');
    expect(calls).toEqual(['resumeKokoro', 'submitKokoro:submitted kokoro']);
  });

  it('locks input settings with the existing messages and panel collapse behavior', () => {
    const notReadyCalls: string[] = [];
    const notReady = renderLifecycle({
      state: stateFixture({
        activeInputMode: 'input2',
        ttsHasText: false,
      }),
      calls: notReadyCalls,
    });

    notReady.lockInputSettings();

    expect(notReadyCalls).toEqual(['error:Paste TTS text before locking this input.']);

    const readyCalls: string[] = [];
    const ready = renderLifecycle({
      state: stateFixture({
        activeInputMode: 'input2',
        ttsHasText: true,
      }),
      calls: readyCalls,
    });

    ready.lockInputSettings();

    expect(readyCalls).toEqual([
      'setInputSettingsLocked:true',
      'collapseSetupPanels',
      'error:',
      'export:Input settings locked for this session.',
    ]);
  });
});

function renderLifecycle({
  state = stateFixture(),
  text = { ttsPracticeText: '', kokoroPracticeText: '' },
  calls,
}: {
  state?: TrainingLifecycleStateInput;
  text?: { ttsPracticeText: string; kokoroPracticeText: string };
  calls: string[];
}): TrainingSessionLifecycle {
  let snapshot: TrainingSessionLifecycle | null = null;

  function Harness() {
    snapshot = useTrainingSessionLifecycle({
      state,
      text,
      actions: {
        resetSession: (options) => calls.push(`reset:${options?.preserveInputSettingsLock ? 'preserve' : 'clear'}`),
        playTts: () => calls.push('playTts'),
        resumeTts: () => calls.push('resumeTts'),
        pauseTts: () => calls.push('pauseTts'),
        stopTts: (action) => calls.push(`stopTts:${action ?? ''}`),
        onTtsPracticeChange: (value) => calls.push(`ttsText:${value}`),
        submitTtsSession: (latestTextValue) => calls.push(`submitTts:${latestTextValue ?? ''}`),
        playKokoro: () => calls.push('playKokoro'),
        resumeKokoro: () => calls.push('resumeKokoro'),
        pauseKokoro: () => calls.push('pauseKokoro'),
        stopKokoro: (action) => calls.push(`stopKokoro:${action ?? ''}`),
        onKokoroPracticeChange: (value) => calls.push(`kokoroText:${value}`),
        submitKokoroSession: (latestTextValue) => calls.push(`submitKokoro:${latestTextValue ?? ''}`),
        setInputSettingsLocked: (value) => calls.push(`setInputSettingsLocked:${value}`),
        setError: (message) => calls.push(`error:${message}`),
        setExportMessage: (message) => calls.push(`export:${message}`),
        collapseSetupPanels: () => calls.push('collapseSetupPanels'),
      },
    });
    return null;
  }

  act(() => {
    root.render(createElement(Harness));
  });

  if (!snapshot) throw new Error('Lifecycle hook did not render.');
  return snapshot;
}

function stateFixture(overrides: Partial<TrainingLifecycleStateInput> = {}): TrainingLifecycleStateInput {
  return {
    activeInputMode: 'input2' as TrainingLifecycleInputMode,
    activeSessionPresent: true,
    activeSessionFinished: false,
    sessionStatus: 'ready' as TrainingLifecycleSessionStatus,
    running: false,
    ttsHasText: false,
    ttsStatus: 'idle' as TrainingLifecyclePlaybackStatus,
    kokoroHasText: false,
    kokoroStatus: 'idle' as TrainingLifecyclePlaybackStatus,
    inputSettingsLocked: false,
    ...overrides,
  };
}
