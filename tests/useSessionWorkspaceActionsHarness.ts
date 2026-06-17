import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import { useSessionWorkspaceActions } from '../src/app/useSessionWorkspaceActions';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

export type HookProps = {
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

export function createDefaultSessionWorkspaceActionProps(overrides: Partial<HookProps> = {}): HookProps {
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

export async function renderSessionWorkspaceActions(props: HookProps): Promise<SessionWorkspaceActions> {
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

export function createSession(
  id: string,
  inputMode: StoredSession['inputMode'] = BROWSER_TTS_SESSION_INPUT_MODE,
): StoredSession {
  return {
    id,
    inputMode,
  } as StoredSession;
}

export async function cleanupSessionWorkspaceActionsRender() {
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
