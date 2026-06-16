import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';
import {
  useTrainingSessionLifecycle,
  type TrainingLifecycleStateInput,
  type TrainingSessionLifecycle,
} from '../../src/app/useTrainingSessionLifecycle';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../src/core/sessionInputModes';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

export type TrainingSessionLifecycleHookOptions = Parameters<typeof useTrainingSessionLifecycle>[0];
export type TrainingSessionLifecycleHookActions = TrainingSessionLifecycleHookOptions['actions'];

type TrainingSessionLifecycleHarnessProps = TrainingSessionLifecycleHookOptions & {
  onLifecycle: (lifecycle: TrainingSessionLifecycle) => void;
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function TrainingSessionLifecycleHarness({ onLifecycle, ...options }: TrainingSessionLifecycleHarnessProps) {
  const lifecycle = useTrainingSessionLifecycle(options);

  useEffect(() => {
    onLifecycle(lifecycle);
  }, [lifecycle, onLifecycle]);

  return null;
}

export function createDefaultState(
  overrides: Partial<TrainingLifecycleStateInput> = {},
): TrainingLifecycleStateInput {
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

export function createDefaultActions(
  overrides: Partial<TrainingSessionLifecycleHookActions> = {},
): TrainingSessionLifecycleHookActions {
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

export async function renderTrainingSessionLifecycle(
  options: Partial<TrainingSessionLifecycleHookOptions> = {},
): Promise<{
  lifecycle: TrainingSessionLifecycle;
  actions: TrainingSessionLifecycleHookActions;
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
    root?.render(createElement(TrainingSessionLifecycleHarness, {
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

export async function cleanupTrainingSessionLifecycleHarness(): Promise<void> {
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
