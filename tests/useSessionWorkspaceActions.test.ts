/**
 * @vitest-environment jsdom
 */

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import { useSessionWorkspaceActions } from '../src/app/useSessionWorkspaceActions';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

type HookProps = {
  dashboardSessionId: string | null;
  workspaceMode: string;
  clearDashboardSession: () => void;
  showLeaderboardWorkspace: () => void;
  deleteSessionAndSync: (sessionId: string) => void;
  setActiveSessionId: (sessionId: string) => void;
  showDashboardWorkspace: (sessionId: string) => void;
  showSessionInputWorkspace: (inputMode: StoredSession['inputMode']) => void;
};

type SessionWorkspaceActions = ReturnType<typeof useSessionWorkspaceActions>;

type TestHarnessProps = HookProps & {
  onActions: (actions: SessionWorkspaceActions) => void;
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function TestHarness({ onActions, ...props }: TestHarnessProps) {
  const actions = useSessionWorkspaceActions(props);

  useEffect(() => {
    onActions(actions);
  }, [actions, onActions]);

  return null;
}

function createDefaultProps(overrides: Partial<HookProps> = {}): HookProps {
  return {
    dashboardSessionId: null,
    workspaceMode: 'leaderboard',
    clearDashboardSession: vi.fn(),
    showLeaderboardWorkspace: vi.fn(),
    deleteSessionAndSync: vi.fn(),
    setActiveSessionId: vi.fn(),
    showDashboardWorkspace: vi.fn(),
    showSessionInputWorkspace: vi.fn(),
    ...overrides,
  };
}

async function renderSessionWorkspaceActions(props: HookProps): Promise<SessionWorkspaceActions> {
  let renderedActions: SessionWorkspaceActions | null = null;
  const onActions = (actions: SessionWorkspaceActions) => {
    renderedActions = actions;
  };

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(TestHarness, { ...props, onActions }));
  });

  if (!renderedActions) {
    throw new Error('useSessionWorkspaceActions did not render actions.');
  }

  return renderedActions;
}

function createSession(
  id: string,
  inputMode: StoredSession['inputMode'] = BROWSER_TTS_SESSION_INPUT_MODE,
): StoredSession {
  return {
    id,
    inputMode,
  } as StoredSession;
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

describe('useSessionWorkspaceActions', () => {
  it('clears the dashboard and returns to the leaderboard when deleting the open dashboard session', async () => {
    const props = createDefaultProps({
      dashboardSessionId: 'dashboard-session',
      workspaceMode: 'dashboard',
    });
    const actions = await renderSessionWorkspaceActions(props);

    actions.deleteSession('dashboard-session');

    expect(props.clearDashboardSession).toHaveBeenCalledTimes(1);
    expect(props.showLeaderboardWorkspace).toHaveBeenCalledTimes(1);
    expect(props.deleteSessionAndSync).toHaveBeenCalledWith('dashboard-session');
  });

  it('clears the dashboard without navigation when deleting the dashboard session from another workspace', async () => {
    const props = createDefaultProps({
      dashboardSessionId: 'dashboard-session',
      workspaceMode: 'leaderboard',
    });
    const actions = await renderSessionWorkspaceActions(props);

    actions.deleteSession('dashboard-session');

    expect(props.clearDashboardSession).toHaveBeenCalledTimes(1);
    expect(props.showLeaderboardWorkspace).not.toHaveBeenCalled();
    expect(props.deleteSessionAndSync).toHaveBeenCalledWith('dashboard-session');
  });

  it('deletes unrelated sessions without clearing dashboard state', async () => {
    const props = createDefaultProps({
      dashboardSessionId: 'dashboard-session',
      workspaceMode: 'dashboard',
    });
    const actions = await renderSessionWorkspaceActions(props);

    actions.deleteSession('other-session');

    expect(props.clearDashboardSession).not.toHaveBeenCalled();
    expect(props.showLeaderboardWorkspace).not.toHaveBeenCalled();
    expect(props.deleteSessionAndSync).toHaveBeenCalledWith('other-session');
  });

  it('opens the dashboard for a session and makes it active', async () => {
    const props = createDefaultProps();
    const actions = await renderSessionWorkspaceActions(props);

    actions.openDashboardForSession('target-session');

    expect(props.setActiveSessionId).toHaveBeenCalledWith('target-session');
    expect(props.showDashboardWorkspace).toHaveBeenCalledWith('target-session');
  });

  it('opens the session input workspace and makes the session active', async () => {
    const props = createDefaultProps();
    const actions = await renderSessionWorkspaceActions(props);
    const session = createSession('target-session');

    actions.openWorkspaceForSession(session);

    expect(props.setActiveSessionId).toHaveBeenCalledWith('target-session');
    expect(props.showSessionInputWorkspace).toHaveBeenCalledWith(BROWSER_TTS_SESSION_INPUT_MODE);
  });
});
