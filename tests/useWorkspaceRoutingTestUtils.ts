import {
  act,
  createElement,
  useEffect,
} from 'react';
import {
  createRoot,
  type Root,
} from 'react-dom/client';
import { expect } from 'vitest';
import {
  useWorkspaceRouting,
  type WorkspaceMode,
} from '../src/app/useWorkspaceRouting';

export const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';

export type WorkspaceRoutingState = ReturnType<typeof useWorkspaceRouting>;
export type WorkspaceRoutingActionName = keyof Pick<
  WorkspaceRoutingState,
  | 'showLeaderboardWorkspace'
  | 'showAdminWorkspace'
  | 'showOpenRouterWorkspace'
  | 'showAdaptiveWorkspace'
  | 'showAdaptiveFlowWorkspace'
>;
type AppRoutePath = Parameters<WorkspaceRoutingState['navigateAppRoute']>[0];
type SessionInputWorkspaceMode = Parameters<WorkspaceRoutingState['showSessionInputWorkspace']>[0];

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

type TestHarnessProps = {
  onRouting: (routing: WorkspaceRoutingState) => void;
};

function TestHarness({ onRouting }: TestHarnessProps) {
  const routing = useWorkspaceRouting();

  useEffect(() => {
    onRouting(routing);
  }, [onRouting, routing]);

  return null;
}

export function resetWorkspaceRoutingEnvironment() {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
}

export async function cleanupWorkspaceRoutingRender() {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }

  root = null;
  container?.remove();
  container = null;
  resetWorkspaceRoutingEnvironment();
}

export async function renderWorkspaceRouting(initialPath = '/'): Promise<{
  getRouting: () => WorkspaceRoutingState;
}> {
  let renderedRouting: WorkspaceRoutingState | null = null;
  const onRouting = (routing: WorkspaceRoutingState) => {
    renderedRouting = routing;
  };

  window.history.replaceState(null, '', initialPath);
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

export async function updateWorkspaceRouting(
  callback: (routing: WorkspaceRoutingState) => void,
  getRouting: () => WorkspaceRoutingState,
) {
  await act(async () => {
    callback(getRouting());
  });
}

export async function showDashboardWorkspace(
  getRouting: () => WorkspaceRoutingState,
  sessionId = 'session-1',
) {
  await updateWorkspaceRouting(
    (routing) => routing.showDashboardWorkspace(sessionId),
    getRouting,
  );
}

export async function clearDashboardSession(getRouting: () => WorkspaceRoutingState) {
  await updateWorkspaceRouting((routing) => routing.clearDashboardSession(), getRouting);
}

export async function switchFromDashboardWorkspace(
  getRouting: () => WorkspaceRoutingState,
  action: WorkspaceRoutingActionName,
) {
  await showDashboardWorkspace(getRouting);
  await updateWorkspaceRouting((routing) => routing[action](), getRouting);
}

export async function navigateAppRoute(
  getRouting: () => WorkspaceRoutingState,
  route: AppRoutePath,
) {
  await updateWorkspaceRouting((routing) => routing.navigateAppRoute(route), getRouting);
}

export async function showSessionInputWorkspace(
  getRouting: () => WorkspaceRoutingState,
  inputMode: SessionInputWorkspaceMode,
) {
  await updateWorkspaceRouting(
    (routing) => routing.showSessionInputWorkspace(inputMode),
    getRouting,
  );
}

export async function dispatchPopState(path: string) {
  await act(async () => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

export function expectStoredWorkspaceMode(mode: WorkspaceMode) {
  expect(window.localStorage.getItem(WORKSPACE_MODE_KEY)).toBe(mode);
}

export function expectWorkspaceState(
  routing: WorkspaceRoutingState,
  expected: {
    mode: WorkspaceMode;
    dashboardSessionId?: string | null;
    currentPath?: string;
  },
) {
  expect(routing.workspaceMode).toBe(expected.mode);

  if ('dashboardSessionId' in expected) {
    expect(routing.dashboardSessionId).toBe(expected.dashboardSessionId ?? null);
  }

  if (expected.currentPath) {
    expect(routing.currentPath).toBe(expected.currentPath);
  }
}

export function expectCurrentBrowserPath(path: string) {
  expect(`${window.location.pathname}${window.location.hash}`).toBe(path);
}
