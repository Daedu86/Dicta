/**
 * @vitest-environment jsdom
 */

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import { useWorkspaceRouting, type WorkspaceMode } from '../src/app/useWorkspaceRouting';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';

type WorkspaceRoutingState = ReturnType<typeof useWorkspaceRouting>;

type TestHarnessProps = {
  onRouting: (routing: WorkspaceRoutingState) => void;
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function TestHarness({ onRouting }: TestHarnessProps) {
  const routing = useWorkspaceRouting();

  useEffect(() => {
    onRouting(routing);
  }, [onRouting, routing]);

  return null;
}

async function renderWorkspaceRouting(): Promise<{
  getRouting: () => WorkspaceRoutingState;
}> {
  let renderedRouting: WorkspaceRoutingState | null = null;
  const onRouting = (routing: WorkspaceRoutingState) => {
    renderedRouting = routing;
  };

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(TestHarness, { onRouting }));
  });

  return {
    getRouting: () => {
      if (!renderedRouting) {
        throw new Error('useWorkspaceRouting did not render routing state.');
      }

      return renderedRouting;
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }

  root = null;
  container?.remove();
  container = null;
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('useWorkspaceRouting', () => {
  it('starts on the training workspace and exposes the current window path', async () => {
    window.history.replaceState(null, '', '/training');

    const { getRouting } = await renderWorkspaceRouting();

    expect(getRouting().workspaceMode).toBe('training');
    expect(getRouting().currentPath).toBe('/training');
    expect(getRouting().dashboardSessionId).toBeNull();
    expect(window.localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('training');
  });

  it('opens a dashboard workspace for the selected session', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await act(async () => {
      getRouting().showDashboardWorkspace('session-1');
    });

    expect(getRouting().workspaceMode).toBe('dashboard');
    expect(getRouting().dashboardSessionId).toBe('session-1');
    expect(window.localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('dashboard');
  });

  it('clears only the dashboard session id when requested', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await act(async () => {
      getRouting().showDashboardWorkspace('session-1');
    });
    await act(async () => {
      getRouting().clearDashboardSession();
    });

    expect(getRouting().workspaceMode).toBe('dashboard');
    expect(getRouting().dashboardSessionId).toBeNull();
  });

  it.each<{ action: keyof WorkspaceRoutingState; mode: WorkspaceMode }>([
    { action: 'showLeaderboardWorkspace', mode: 'training' },
    { action: 'showAdminWorkspace', mode: 'admin' },
    { action: 'showOpenRouterWorkspace', mode: 'openrouter' },
    { action: 'showAdaptiveWorkspace', mode: 'adaptive' },
  ])('switches to $mode and clears the dashboard session id', async ({ action, mode }) => {
    const { getRouting } = await renderWorkspaceRouting();

    await act(async () => {
      getRouting().showDashboardWorkspace('session-1');
    });
    await act(async () => {
      const routeAction = getRouting()[action];

      if (typeof routeAction !== 'function') {
        throw new Error(`${action} is not callable.`);
      }

      routeAction();
    });

    expect(getRouting().workspaceMode).toBe(mode);
    expect(getRouting().dashboardSessionId).toBeNull();
    expect(window.localStorage.getItem(WORKSPACE_MODE_KEY)).toBe(mode);
  });

  it('navigates app routes through history and currentPath state', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await act(async () => {
      getRouting().navigateAppRoute('/training');
    });

    expect(window.location.pathname).toBe('/training');
    expect(getRouting().currentPath).toBe('/training');

    await act(async () => {
      getRouting().navigateAppRoute('/');
    });

    expect(window.location.pathname).toBe('/');
    expect(getRouting().currentPath).toBe('/');
  });

  it('routes session input workspaces to /training and clears the dashboard session id', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await act(async () => {
      getRouting().showDashboardWorkspace('session-1');
    });
    await act(async () => {
      getRouting().showSessionInputWorkspace(BROWSER_TTS_SESSION_INPUT_MODE);
    });

    expect(window.location.pathname).toBe('/training');
    expect(getRouting().currentPath).toBe('/training');
    expect(getRouting().dashboardSessionId).toBeNull();
  });

  it('updates currentPath when the browser popstate event fires', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    expect(getRouting().currentPath).toBe('/');

    await act(async () => {
      window.history.pushState(null, '', '/training');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(getRouting().currentPath).toBe('/training');
  });
});
