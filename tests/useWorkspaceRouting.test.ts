/**
 * @vitest-environment jsdom
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  cleanupWorkspaceRoutingRender,
  clearDashboardSession,
  dispatchPopState,
  expectCurrentBrowserPath,
  expectStoredWorkspaceMode,
  expectWorkspaceState,
  navigateAppRoute,
  renderWorkspaceRouting,
  resetWorkspaceRoutingEnvironment,
  showDashboardWorkspace,
  showSessionInputWorkspace,
  switchFromDashboardWorkspace,
  updateWorkspaceRouting,
  type WorkspaceRoutingActionName,
  WORKSPACE_MODE_KEY,
} from './useWorkspaceRoutingTestUtils';
import type { WorkspaceMode } from '../src/app/useWorkspaceRouting';

beforeEach(() => {
  resetWorkspaceRoutingEnvironment();
});

afterEach(async () => {
  await cleanupWorkspaceRoutingRender();
});

describe('useWorkspaceRouting', () => {
  it('starts on the training workspace and exposes the current window path', async () => {
    const { getRouting } = await renderWorkspaceRouting('/training');

    expectWorkspaceState(getRouting(), {
      mode: 'training',
      currentPath: '/training',
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode('training');
  });

  it('starts on the adaptive flow workspace when loaded from the hash route', async () => {
    const { getRouting } = await renderWorkspaceRouting('/#adaptive-flow');

    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/#adaptive-flow',
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode('adaptive-flow');
  });

  it('starts on the adaptive flow workspace when loaded from a phase hash route', async () => {
    const { getRouting } = await renderWorkspaceRouting('/#adaptive-flow/planner');

    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/#adaptive-flow/planner',
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode('adaptive-flow');
  });

  it('still accepts the legacy /adaptive/flow path when the host serves it', async () => {
    const { getRouting } = await renderWorkspaceRouting('/adaptive/flow');

    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/adaptive/flow',
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode('adaptive-flow');
  });

  it('restores the adaptive flow workspace from the small workspace preference', async () => {
    window.localStorage.setItem(WORKSPACE_MODE_KEY, 'adaptive-flow');

    const { getRouting } = await renderWorkspaceRouting('/');

    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/',
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode('adaptive-flow');
  });

  it('opens a dashboard workspace for the selected session', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await showDashboardWorkspace(getRouting, 'session-1');

    expectWorkspaceState(getRouting(), {
      mode: 'dashboard',
      currentPath: '/',
      dashboardSessionId: 'session-1',
    });
    expectStoredWorkspaceMode('dashboard');
  });

  it('clears only the dashboard session id when requested', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await showDashboardWorkspace(getRouting, 'session-1');
    await clearDashboardSession(getRouting);

    expectWorkspaceState(getRouting(), {
      mode: 'dashboard',
      dashboardSessionId: null,
    });
  });

  it.each<{ action: WorkspaceRoutingActionName; mode: WorkspaceMode; path: string }>([
    { action: 'showLeaderboardWorkspace', mode: 'training', path: '/' },
    { action: 'showAdminWorkspace', mode: 'admin', path: '/admin' },
    { action: 'showOpenRouterWorkspace', mode: 'openrouter', path: '/openrouter' },
    { action: 'showAdaptiveFlowWorkspace', mode: 'adaptive-flow', path: '/#adaptive-flow' },
    { action: 'showAdaptiveFlowGenerationWorkspace', mode: 'adaptive-flow', path: '/#adaptive-flow/generation' },
  ])('switches to $mode and clears the dashboard session id', async ({ action, mode, path }) => {
    const { getRouting } = await renderWorkspaceRouting();

    await switchFromDashboardWorkspace(getRouting, action);

    expectWorkspaceState(getRouting(), {
      mode,
      currentPath: path,
      dashboardSessionId: null,
    });
    expectCurrentBrowserPath(path);
    expectStoredWorkspaceMode(mode);
  });

  it('treats the removed /adaptive route as the training workspace', async () => {
    const { getRouting } = await renderWorkspaceRouting('/adaptive');

    expectWorkspaceState(getRouting(), {
      mode: 'training',
      currentPath: '/adaptive',
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode('training');
  });

  it('opens the adaptive flow workspace off the focused training route', async () => {
    const { getRouting } = await renderWorkspaceRouting('/training');

    await updateWorkspaceRouting((routing) => routing.showAdaptiveFlowWorkspace(), getRouting);

    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/#adaptive-flow',
      dashboardSessionId: null,
    });
    expectCurrentBrowserPath('/#adaptive-flow');
    expectStoredWorkspaceMode('adaptive-flow');
  });

  it('navigates app routes through history and currentPath state', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await navigateAppRoute(getRouting, '/training');

    expectCurrentBrowserPath('/training');
    expect(getRouting().currentPath).toBe('/training');

    await navigateAppRoute(getRouting, '/#adaptive-flow');

    expectCurrentBrowserPath('/#adaptive-flow');
    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/#adaptive-flow',
    });

    await navigateAppRoute(getRouting, '/');

    expectCurrentBrowserPath('/');
    expect(getRouting().currentPath).toBe('/');
  });

  it('routes session input workspaces to /training and clears the dashboard session id', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await showDashboardWorkspace(getRouting, 'session-1');
    await showSessionInputWorkspace(getRouting, BROWSER_TTS_SESSION_INPUT_MODE);

    expectCurrentBrowserPath('/training');
    expect(getRouting().currentPath).toBe('/training');
    expect(getRouting().dashboardSessionId).toBeNull();
  });

  it('updates currentPath and workspaceMode when the browser popstate event fires', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    expect(getRouting().currentPath).toBe('/');

    await dispatchPopState('/#adaptive-flow/browser-tts');

    expectWorkspaceState(getRouting(), {
      mode: 'adaptive-flow',
      currentPath: '/#adaptive-flow/browser-tts',
      dashboardSessionId: null,
    });
  });
});
