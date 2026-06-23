// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppShellHeaderProps } from '../src/components/app-shell/AppShellHeader';

const appUpdateMock = vi.hoisted(() => ({ available: false }));

vi.mock('../src/app/useAppUpdateAvailable', () => ({
  useAppUpdateAvailable: () => appUpdateMock.available,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let AppShellHeader: (props: AppShellHeaderProps) => ReactNode;

beforeAll(async () => {
  AppShellHeader = (await import('../src/components/app-shell/AppShellHeader')).AppShellHeader;
});

beforeEach(() => {
  appUpdateMock.available = false;
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

describe('AppShellHeader', () => {
  it('renders OpenRouter model status as a compact LLM LED badge', () => {
    act(() => {
      root.render(createElement(AppShellHeader, appShellHeaderProps({
        openRouterModelIsSet: true,
        openRouterModelTitle: 'LLM assigned: openai/gpt-oss-120b:free',
      })));
    });

    const badge = host.querySelector<HTMLElement>('.brand-llm-status');
    const actions = host.querySelector<HTMLElement>('.brand-header-actions');

    expect(badge?.textContent).toBe('LLM');
    expect(badge?.getAttribute('title')).toBe('LLM assigned: openai/gpt-oss-120b:free');
    expect(badge?.classList.contains('brand-llm-status-set')).toBe(true);
    expect(badge?.querySelector('.brand-llm-status-led')).not.toBeNull();
    expect(badge?.textContent).not.toContain('Model set');
    expect(actions?.contains(badge)).toBe(true);

    const actionChildren = Array.from(actions?.children ?? []);
    const signOutIndex = actionChildren.findIndex((element) => element.classList.contains('brand-signout-button'));
    const badgeIndex = actionChildren.indexOf(badge as HTMLElement);
    const syncIndex = actionChildren.findIndex((element) => element.classList.contains('brand-sync-status'));

    expect(signOutIndex).toBeGreaterThanOrEqual(0);
    expect(badgeIndex).toBeGreaterThan(signOutIndex);
    expect(syncIndex).toBeGreaterThan(badgeIndex);
  });

  it('renders the adaptive pace layer flow tab without the removed cockpit tab', () => {
    const onOpenAdaptiveFlow = vi.fn();

    act(() => {
      root.render(createElement(AppShellHeader, appShellHeaderProps({
        showAdaptiveFlowButton: true,
        onOpenAdaptiveFlow,
      })));
    });

    const adaptiveButton = host.querySelector<HTMLButtonElement>('.brand-adaptive-button');
    const adaptiveFlowButton = host.querySelector<HTMLButtonElement>('.brand-adaptive-flow-button');

    expect(adaptiveButton).toBeNull();
    expect(adaptiveFlowButton?.textContent).toContain('Adaptive Pace Layer Flow');

    act(() => {
      adaptiveFlowButton?.click();
    });

    expect(onOpenAdaptiveFlow).toHaveBeenCalledTimes(1);
  });

  it('uses the red LED state when no LLM is assigned', () => {
    act(() => {
      root.render(createElement(AppShellHeader, appShellHeaderProps({
        openRouterModelIsSet: false,
        openRouterModelTitle: 'LLM not assigned',
      })));
    });

    const badge = host.querySelector<HTMLElement>('.brand-llm-status');

    expect(badge?.textContent).toBe('LLM');
    expect(badge?.getAttribute('aria-label')).toBe('LLM not assigned');
    expect(badge?.classList.contains('brand-llm-status-unset')).toBe(true);
  });

  it('renders the app update action after Sync in the header actions', () => {
    appUpdateMock.available = true;

    act(() => {
      root.render(createElement(AppShellHeader, appShellHeaderProps({
        syncStatusState: 'synced',
        syncStatusText: 'Sync: synced',
      })));
    });

    const actions = host.querySelector<HTMLElement>('.brand-header-actions');
    const updateButton = host.querySelector<HTMLButtonElement>('.brand-update-button');

    expect(host.querySelector('.brand-header-update-row')).toBeNull();
    expect(updateButton?.textContent).toBe('Update APP');
    expect(updateButton?.getAttribute('aria-label')).toBe('Update Dicta app to the latest version');
    expect(actions?.classList.contains('brand-header-actions-has-update')).toBe(true);

    const actionChildren = Array.from(actions?.children ?? []);
    const syncIndex = actionChildren.findIndex((element) => element.classList.contains('brand-sync-status'));
    const updateIndex = actionChildren.findIndex((element) => element.classList.contains('brand-update-button'));

    expect(syncIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBe(syncIndex + 1);
  });
});

function appShellHeaderProps(overrides: Partial<AppShellHeaderProps> = {}): AppShellHeaderProps {
  return {
    themeMode: 'light',
    showOpenRouterStatus: true,
    openRouterModelIsSet: true,
    openRouterModelTitle: 'LLM assigned: openai/gpt-oss-120b:free',
    buildInfoTitle: 'Dicta build',
    buildInfoLabel: 'commit: test',
    showAdminButton: false,
    showAdaptiveFlowButton: false,
    showOpenRouterButton: false,
    syncStatusState: 'idle',
    syncStatusText: 'Sync: idle',
    appProfile: {
      userId: 'user-1',
      profileId: 'profile-1',
      displayName: 'Test User',
      role: 'member',
      active: true,
      canAccessOpenRouter: true,
      assignedOpenRouterModel: 'openai/gpt-oss-120b:free',
      sessionLimit: 15,
    },
    sessionQuotaLimit: 15,
    sessionQuotaUsed: 0,
    sessionQuotaBlocked: false,
    onOpenMobileTraining: vi.fn(),
    onOpenAdaptiveFlow: vi.fn(),
    onOpenAdmin: vi.fn(),
    onOpenOpenRouter: vi.fn(),
    onToggleTheme: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
}
