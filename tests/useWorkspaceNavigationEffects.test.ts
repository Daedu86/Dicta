/**
 * @vitest-environment jsdom
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import { useWorkspaceNavigationEffects } from '../src/app/useWorkspaceNavigationEffects';
import type { WorkspaceMode } from '../src/app/useWorkspaceRouting';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

type HookProps = {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  activeSessionId: string;
  activeInputWorkspaceMode: WorkspaceMode;
  workspaceMode: WorkspaceMode;
  isFocusedTrainingRoute: boolean;
  openRouterAccessState: 'pending' | 'allowed' | 'denied';
  openRouterAccessMessage: string;
  suppressSidebarAutoSelectRef: { current: boolean };
  setActiveSessionId: (sessionId: string) => void;
  setOpenRouterError: (message: string) => void;
  showLeaderboardWorkspace: () => void;
  showWorkspaceMode: (workspaceMode: WorkspaceMode) => void;
};

function createSession(id: string): StoredSession {
  return { id } as StoredSession;
}

function TestHarness(props: HookProps) {
  useWorkspaceNavigationEffects(props);
  return null;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderNavigationEffects(props: HookProps): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(TestHarness, props));
  });
}

function createDefaultProps(overrides: Partial<HookProps> = {}): HookProps {
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
  };
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

describe('useWorkspaceNavigationEffects', () => {
  it('returns to the leaderboard and publishes the access error when OpenRouter access is denied', async () => {
    const props = createDefaultProps({
      workspaceMode: 'openrouter',
      openRouterAccessState: 'denied',
      openRouterAccessMessage: 'OpenRouter access requires profile approval.',
    });

    await renderNavigationEffects(props);

    expect(props.showLeaderboardWorkspace).toHaveBeenCalledTimes(1);
    expect(props.setOpenRouterError).toHaveBeenCalledWith('OpenRouter access requires profile approval.');
  });

  it('clears the active session id when no sessions remain', async () => {
    const props = createDefaultProps({
      sessions: [],
      activeSession: null,
      activeSessionId: 'missing-session',
    });

    await renderNavigationEffects(props);

    expect(props.setActiveSessionId).toHaveBeenCalledWith('');
  });

  it('selects the first session when the active session id no longer exists', async () => {
    const firstSession = createSession('first-session');
    const secondSession = createSession('second-session');
    const props = createDefaultProps({
      sessions: [firstSession, secondSession],
      activeSession: firstSession,
      activeSessionId: 'deleted-session',
    });

    await renderNavigationEffects(props);

    expect(props.setActiveSessionId).toHaveBeenCalledWith('first-session');
  });

  it('keeps the current active session id when it still exists', async () => {
    const activeSession = createSession('active-session');
    const props = createDefaultProps({
      sessions: [createSession('other-session'), activeSession],
      activeSession,
      activeSessionId: activeSession.id,
    });

    await renderNavigationEffects(props);

    expect(props.setActiveSessionId).not.toHaveBeenCalled();
  });

  it('auto-selects the active input workspace from the training workspace', async () => {
    const props = createDefaultProps({
      workspaceMode: 'training',
      activeInputWorkspaceMode: 'tts',
      suppressSidebarAutoSelectRef: { current: false },
    });

    await renderNavigationEffects(props);

    expect(props.showWorkspaceMode).toHaveBeenCalledWith('tts');
  });

  it('does not auto-select the active input workspace when sidebar auto-select is suppressed', async () => {
    const props = createDefaultProps({
      workspaceMode: 'training',
      activeInputWorkspaceMode: 'tts',
      suppressSidebarAutoSelectRef: { current: true },
    });

    await renderNavigationEffects(props);

    expect(props.showWorkspaceMode).not.toHaveBeenCalled();
  });

  it('does not auto-select the active input workspace on the focused training route', async () => {
    const props = createDefaultProps({
      workspaceMode: 'training',
      isFocusedTrainingRoute: true,
      activeInputWorkspaceMode: 'tts',
      suppressSidebarAutoSelectRef: { current: false },
    });

    await renderNavigationEffects(props);

    expect(props.showWorkspaceMode).not.toHaveBeenCalled();
  });

  it.each<WorkspaceMode>(['dashboard', 'adaptive', 'adaptive-flow', 'admin', 'openrouter'])(
    'does not auto-select the active input workspace while viewing %s',
    async (workspaceMode) => {
      const props = createDefaultProps({
        workspaceMode,
        activeInputWorkspaceMode: 'tts',
        suppressSidebarAutoSelectRef: { current: false },
      });

      await renderNavigationEffects(props);

      expect(props.showWorkspaceMode).not.toHaveBeenCalled();
    },
  );
});
