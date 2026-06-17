import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

export function setupSessionPersistenceSyncHarness(): void {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
}

export function cleanupSessionPersistenceSyncHarness(): void {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  host?.remove();
  host = null;
}

export function getSessionPersistenceHarnessRoot(): Root {
  if (!root) throw new Error('Session persistence sync harness root is not mounted.');
  return root;
}

export async function flushReactWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}
