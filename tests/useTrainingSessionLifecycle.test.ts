/**
 * @vitest-environment jsdom
 */

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  deriveTrainingLifecycleState,
  useTrainingSessionLifecycle,
  type TrainingLifecycleStateInput,
  type TrainingSessionLifecycle,
} from '../src/app/useTrainingSessionLifecycle';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTrainingSessionLifecycle>[0];
type HookActions = HookOptions['actions'];

type TestHarnessProps = HookOptions & {
  onLifecycle: (lifecycle: TrainingSessionLifecycle) => void;
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function TestHarness({ onLifecycle, ...options }: TestHarnessProps) {
  const lifecycle = useTrainingSessionLifecycle(options);

  useEffect(() => {
    onLifecycle(lifecycle);
  }, [lifecycle, onLifecycle]);

  return null;
}

function createDefaultState(overrides: Partial<TrainingLifecycleStateInput> = {}): TrainingLifecycleStateInput {
  return {
    activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    activeSessionPresent: true,
    activeSessionFinished: false,
    sessionStatus: 'ready',
    running: false,
    ttsHasText: true,
    ttsStatus: 'ready',
    inputSettingsLocked: false,
    ...overrides,
  };
}

function createDefaultActions(overrides: Partial<HookActions> = {}): HookActions {
  return {
    resetSession: vi.fn(),
    playTts: vi.fn(),
    resumeTts: vi.fn(),
    pauseTts: vi.fn(),
    stopTts: vi.fn(),
    onTtsPracticeChange: vi.fn(),
    submitTtsSession: vi.fn(),
    setInputSettingsLocked: vi.fn(),
    setError: vi.fn(),
    setExportMessage: vi.fn(),
    collapseSetupPanels: vi.fn(),
    ...overrides,
  };
}

async function renderTrainingSessionLifecycle(
  options: Partial<HookOptions> = {},
): Promise<{
  lifecycle: TrainingSessionLifecycle;
  actions: HookActions;
}> {
  let renderedLifecycle: TrainingSessionLifecycle | null = null;
  const actions = options.actions ?? createDefaultActions();

  const onLifecycle = (lifecycle: TrainingSessionLifecycle) => {
    renderedLifecycle = lifecycle;
  };

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(TestHarness, {
      state: options.state ?? createDefaultState(),
      text: options.text ?? { ttsPracticeText: 'current text' },
      actions,
      onLifecycle,
    }));
  });

  if (!renderedLifecycle) {
    throw new Error('useTrainingSessionLifecycle did not render lifecycle state.');
  }

  return { lifecycle: renderedLifecycle, actions };
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

describe('deriveTrainingLifecycleState', () => {
  it('marks Browser TTS input settings ready only when TTS text exists', () => {
    expect(deriveTrainingLifecycleState(createDefaultState())).toMatchObject({
      inputSettingsReady: true,
      setupLocked: false,
      canSubmitTtsSession: true,
      readyChecklist: [{ label: 'TTS source loaded', ready: true }],
    });

    expect(deriveTrainingLifecycleState(createDefaultState({ ttsHasText: false }))).toMatchObject({
      inputSettingsReady: false,
      canSubmitTtsSession: false,
      readyChecklist: [{ label: 'TTS source loaded', ready: false }],
    });
  });

  it('locks setup for finished, error, or input-settings-locked sessions', () => {
    expect(deriveTrainingLifecycleState(createDefaultState({ activeSessionFinished: true })).setupLocked).toBe(true);
    expect(deriveTrainingLifecycleState(createDefaultState({ sessionStatus: 'error' })).setupLocked).toBe(true);
    expect(deriveTrainingLifecycleState(createDefaultState({ inputSettingsLocked: true })).setupLocked).toBe(true);
  });
});

describe('useTrainingSessionLifecycle', () => {
  it('resets focused training attempts while preserving the input settings lock', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle();

    act(() => {
      lifecycle.resetFocusedTrainingAttempt();
    });

    expect(actions.resetSession).toHaveBeenCalledTimes(1);
    expect(actions.resetSession).toHaveBeenCalledWith({ preserveInputSettingsLock: true });
  });

  it('wires the focused reset control to the same preserve-lock reset action', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle();

    act(() => {
      lifecycle.focusedTrainingControls.onReset();
    });

    expect(lifecycle.focusedTrainingControls.canReset).toBe(true);
    expect(actions.resetSession).toHaveBeenCalledWith({ preserveInputSettingsLock: true });
  });

  it('blocks input locking until Browser TTS text is available', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle({
      state: createDefaultState({ ttsHasText: false }),
    });

    act(() => {
      lifecycle.lockInputSettings();
    });

    expect(actions.setError).toHaveBeenCalledWith('Paste TTS text before locking this input.');
    expect(actions.setInputSettingsLocked).not.toHaveBeenCalled();
    expect(actions.collapseSetupPanels).not.toHaveBeenCalled();
  });

  it('locks ready input settings and collapses setup panels', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle();

    act(() => {
      lifecycle.lockInputSettings();
    });

    expect(actions.setInputSettingsLocked).toHaveBeenCalledWith(true);
    expect(actions.collapseSetupPanels).toHaveBeenCalledTimes(1);
    expect(actions.setError).toHaveBeenCalledWith('');
    expect(actions.setExportMessage).toHaveBeenCalledWith('Input settings locked for this session.');
  });

  it('updates edited text before pausing or stopping playback', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle({
      state: createDefaultState({ ttsStatus: 'playing' }),
      text: { ttsPracticeText: 'old text' },
    });

    act(() => {
      lifecycle.focusedTrainingControls.onPause('new text');
      lifecycle.focusedTrainingControls.onStop('newer text');
    });

    expect(actions.onTtsPracticeChange).toHaveBeenNthCalledWith(1, 'new text');
    expect(actions.pauseTts).toHaveBeenCalledTimes(1);
    expect(actions.onTtsPracticeChange).toHaveBeenNthCalledWith(2, 'newer text');
    expect(actions.stopTts).toHaveBeenCalledWith('stop');
  });

  it('resumes paused Browser TTS playback instead of starting a new play action', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle({
      state: createDefaultState({ ttsStatus: 'paused' }),
    });

    act(() => {
      lifecycle.focusedTrainingControls.onPlay();
    });

    expect(lifecycle.focusedTrainingControls.playLabel).toBe('Resume');
    expect(actions.resumeTts).toHaveBeenCalledTimes(1);
    expect(actions.playTts).not.toHaveBeenCalled();
  });
});
