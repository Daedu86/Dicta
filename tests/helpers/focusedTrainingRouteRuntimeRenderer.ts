import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';
import type {
  UseFocusedTrainingRouteRuntimeArgs,
  UseFocusedTrainingRouteRuntimeResult,
} from '../../src/app/useFocusedTrainingRouteRuntime';
import { FocusedTrainingRouteRuntimeHarness } from './focusedTrainingRouteRuntimeHarness';
import { createFocusedTrainingRouteRuntimeArgs } from './focusedTrainingRouteRuntimeArgsFactory';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

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
