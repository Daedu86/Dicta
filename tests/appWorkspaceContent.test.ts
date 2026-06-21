// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppWorkspaceContent } from '../src/app/AppWorkspaceContent';
import type { StoredSession } from '../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

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

describe('AppWorkspaceContent', () => {
  it('omits the idle training workspace panel while preserving pending sessions', () => {
    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        pendingSessions: [createPendingSession()],
        workspaceMode: 'training',
      })));
    });

    expect(host.querySelector('[aria-label="Pending sessions"]')).not.toBeNull();
    expect(host.querySelector('.workspace-panel')).toBeNull();
  });

  it('renders the adaptive pace layer flow workspace with language tabs and the brain cycle', () => {
    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        workspaceMode: 'adaptive-flow',
      })));
    });

    expect(host.textContent).toContain('Adaptative Pace Layer Flow');
    expect(host.querySelectorAll('.adaptive-flow-language-button')).toHaveLength(5);
    expect(host.textContent).toContain('Fase 1');
    expect(host.textContent).toContain('Generate session');
    expect(host.textContent).toContain('Fase 7');
    expect(host.textContent).toContain('Goes to Fase 1');
  });
});

type AppWorkspaceContentProps = Parameters<typeof AppWorkspaceContent>[0];

function buildWorkspaceContentProps(overrides: Partial<AppWorkspaceContentProps> = {}): AppWorkspaceContentProps {
  return {
    pendingSessions: [],
    activeSessionId: '',
    onOpenPendingSession: vi.fn(),
    onDeleteSession: vi.fn(),
    workspaceMode: 'training',
    dashboardSession: null,
    sessions: [],
    formatSessionStatus: (status) => status,
    formatSessionDate: (value) => value,
    formatSessionPlaybackDuration: () => '0s',
    onBackToTraining: vi.fn(),
    adaptiveBenchmarkSectionProps: {} as never,
    adaptiveReportButtonProps: {
      metricsLanguageView: 'en',
      insightsDiagnosticInputMode: 'browser-tts',
      insightsDiagnosticMessage: null,
      onCopyInsightsDiagnosticPackage: vi.fn(),
      formatInputModeLabel: (inputMode) => inputMode,
    } as never,
    openRouterAccessState: 'denied',
    openRouterAccessMessage: '',
    openRouterWorkspaceProps: {} as never,
    canAccessAdminWorkspace: false,
    adminWorkspaceProps: {} as never,
    ...overrides,
  };
}

function createPendingSession(): StoredSession {
  return {
    id: 'session-1',
    name: 'Deutsch Alltag',
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: true,
    ttsText: 'Guten Morgen.',
    ttsLanguage: 'de',
    ttsPracticeText: '',
    difficulty: 'normal',
    status: 'ready',
    metrics: {
      controllerState: 'normal',
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 0,
      trend: 'stable',
      score: 0,
      points: 0,
    },
    telemetry: {
      timeline: [],
      controlActions: [],
      startedAt: null,
      completedAt: null,
      activeTypingMs: 0,
      totalPauses: 0,
      replayCount: 0,
      adaptiveTimeline: [],
    },
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    createdDeviceKind: 'desktop',
    dictationScript: null,
  };
}
