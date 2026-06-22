import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import { useWorkspaceNavigationEffects } from '../src/app/useWorkspaceNavigationEffects';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

export type NavigationEffectProps = Parameters<typeof useWorkspaceNavigationEffects>[0];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

export function createSession(id: string): StoredSession {
  return { id } as StoredSession;
}

function TestHarness(props: NavigationEffectProps) {
  useWorkspaceNavigationEffects(props);
  return null;
}

export async function renderNavigationEffects(props: NavigationEffectProps): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(TestHarness, props));
  });
}

export function createDefaultNavigationEffectProps(overrides: Partial<NavigationEffectProps> = {}): NavigationEffectProps {
  const activeSession = createSession('active-session');

  return {
    sessions: [activeSession],
    activeSession,
    activeSessionId: activeSession.id,
    activeInputWorkspaceMode: 'tts',
    workspaceMode: 'dashboard',
    isFocusedTrainingRoute: false,
    openRouterAccessState: 'allowed',
    openRouterAccessMessage: '',
    suppressSidebarAutoSelectRef: { current: false },
    setActiveSessionId: vi.fn(),
    setOpenRouterError: vi.fn(),
    showLeaderboardWorkspace: vi.fn(),
    showWorkspaceMode: vi.fn(),
    ...overrides,
  } as NavigationEffectProps;
}

export async function cleanupWorkspaceNavigationEffectsRender() {
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
