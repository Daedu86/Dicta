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
  type WorkspaceRoutingActionName,
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

  it('opens a dashboard workspace for the selected session', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await showDashboardWorkspace(getRouting, 'session-1');

    expectWorkspaceState(getRouting(), {
      mode: 'dashboard',
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

  it.each<{ action: WorkspaceRoutingActionName; mode: WorkspaceMode }>([
    { action: 'showLeaderboardWorkspace', mode: 'training' },
    { action: 'showAdminWorkspace', mode: 'admin' },
    { action: 'showOpenRouterWorkspace', mode: 'openrouter' },
    { action: 'showAdaptiveWorkspace', mode: 'adaptive' },
  ])('switches to $mode and clears the dashboard session id', async ({ action, mode }) => {
    const { getRouting } = await renderWorkspaceRouting();

    await switchFromDashboardWorkspace(getRouting, action);

    expectWorkspaceState(getRouting(), {
      mode,
      dashboardSessionId: null,
    });
    expectStoredWorkspaceMode(mode);
  });

  it('navigates app routes through history and currentPath state', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    await navigateAppRoute(getRouting, '/training');

    expectCurrentBrowserPath('/training');
    expect(getRouting().currentPath).toBe('/training');

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

  it('updates currentPath when the browser popstate event fires', async () => {
    const { getRouting } = await renderWorkspaceRouting();

    expect(getRouting().currentPath).toBe('/');

    await dispatchPopState('/training');

    expect(getRouting().currentPath).toBe('/training');
  });
});
