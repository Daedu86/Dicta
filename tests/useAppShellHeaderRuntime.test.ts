// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useAppShellHeaderRuntime as useAppShellHeaderRuntimeType } from '../src/app/useAppShellHeaderRuntime';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let useAppShellHeaderRuntime: typeof useAppShellHeaderRuntimeType;

beforeAll(async () => {
  vi.stubGlobal('__DICTA_BUILD_INFO__', {
    branch: 'test',
    commitSha: 'test-sha',
    shortCommitSha: 'test',
    commitTimestamp: '2026-06-22T00:00:00.000Z',
    commitMessage: 'test',
    buildTimestamp: '2026-06-22T00:00:00.000Z',
  });
  useAppShellHeaderRuntime = (await import('../src/app/useAppShellHeaderRuntime')).useAppShellHeaderRuntime;
});

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('useAppShellHeaderRuntime', () => {
  it('routes Training Mode to the focused training route instead of the home workspace fallback', () => {
    const navigateAppRoute = vi.fn();
    let runtime: ReturnType<typeof useAppShellHeaderRuntime> | null = null;

    function Harness() {
      runtime = useAppShellHeaderRuntime(buildHeaderRuntimeArgs({
        navigateAppRoute,
      }));
      return null;
    }

    act(() => {
      root.render(createElement(Harness));
    });

    act(() => {
      runtime?.appShellHeaderProps.onOpenMobileTraining();
    });

    expect(navigateAppRoute).toHaveBeenCalledTimes(1);
    expect(navigateAppRoute).toHaveBeenCalledWith('/training');
  });
});

type HeaderRuntimeArgs = Parameters<typeof useAppShellHeaderRuntime>[0];

function buildHeaderRuntimeArgs(overrides: Partial<HeaderRuntimeArgs> = {}): HeaderRuntimeArgs {
  return {
    themeMode: 'light',
    isOnline: true,
    effectiveOpenRouterDefaultModel: '',
    isCurrentProfileAdmin: true,
    authRequired: true,
    supabaseSyncStatus: {
      enabled: true,
      state: 'synced',
      message: '',
      lastSyncedAt: null,
      imported: 0,
      pushed: 0,
    },
    pendingSyncSummary: {
      count: 0,
      hasPending: false,
    },
    appProfile: {
      userId: 'user-1',
      profileId: 'profile-1',
      displayName: 'Admin',
      role: 'admin',
      active: true,
      canAccessOpenRouter: true,
      assignedOpenRouterModel: null,
      sessionLimit: null,
    },
    sessionQuotaStatus: {
      blocked: false,
      limit: null,
      used: 0,
      remaining: null,
    },
    navigateAppRoute: vi.fn(),
    showAdaptiveFlowWorkspace: vi.fn(),
    showAdminWorkspace: vi.fn(),
    showOpenRouterWorkspace: vi.fn(),
    setThemeMode: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}
