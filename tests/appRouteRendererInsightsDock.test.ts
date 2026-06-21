// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouteRenderer } from '../src/app/AppRouteRenderer';
import type { WorkspaceMode } from '../src/app/useWorkspaceRouting';
import type { AdaptiveBenchmarkSection } from '../src/components/adaptive-workspace/AdaptiveBenchmarkWorkspace';
import type { LiveMetricsDockProps } from '../src/components/runtime-workspaces/LiveMetricsDock';

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

describe('AppRouteRenderer Insights dock visibility', () => {
  it.each<WorkspaceMode>(['training', 'tts'])(
    'renders the Insights dock on the Home workspace state %s',
    (workspaceMode) => {
      renderRoute(workspaceMode);

      expect(host.querySelector('.bottom-metrics-dock')).not.toBeNull();
    },
  );

  it.each<WorkspaceMode>(['adaptive', 'adaptive-flow', 'admin', 'openrouter'])(
    'omits the shared Insights dock from the %s workspace',
    (workspaceMode) => {
      renderRoute(workspaceMode);

      expect(host.querySelector('.bottom-metrics-dock')).toBeNull();
    },
  );

  it('renders the adaptive flow implementation cycle without the shared Insights dock', () => {
    renderRoute('adaptive-flow');

    expect(host.textContent).toContain('Implementation cycle');
    expect(host.textContent).toContain('Generation');
    expect(host.textContent).toContain('Planner');
    expect(host.textContent).toContain('Chunker');
    expect(host.textContent).toContain('Browser TTS');
    expect(host.textContent).toContain('Telemetry');
    expect(host.textContent).toContain('Benchmark');
    expect(host.textContent).toContain('Adaptation');
    expect(host.textContent).not.toContain('Insights');
    expect(host.querySelector('.bottom-metrics-dock')).toBeNull();
  });
});

function renderRoute(workspaceMode: WorkspaceMode): void {
  act(() => {
    root.render(createElement(AppRouteRenderer, createRouteProps(workspaceMode)));
  });
}

function createRouteProps(workspaceMode: WorkspaceMode): ComponentProps<typeof AppRouteRenderer> {
  const liveMetricsDockProps = createLiveMetricsDockProps();

  return {
    syncAuthRequired: false,
    authLoading: false,
    authView: 'signIn',
    authSession: null,
    appProfile: null,
    appProfileError: null,
    localStorageReadyForEffectiveProfile: true,
    supabaseInitialSyncPending: false,
    authWorkspaceProps: {} as never,
    isFocusedTrainingRoute: false,
    themeMode: 'dark',
    dictaLanguageView: 'de',
    setDictaLanguageView: vi.fn(),
    onBackToApp: vi.fn(),
    focusedTrainingProps: {} as never,
    perfDiagnosticsEnabled: false,
    appShellHeaderProps: {
      themeMode: 'dark',
      showOpenRouterStatus: false,
      openRouterModelIsSet: false,
      openRouterModelTitle: '',
      buildInfoTitle: '',
      buildInfoLabel: '',
      showAdminButton: false,
      showAdaptiveButton: false,
      showOpenRouterButton: false,
      syncStatusState: 'idle',
      syncStatusText: 'Idle',
      appProfile: null,
      sessionQuotaLimit: null,
      sessionQuotaUsed: 0,
      sessionQuotaBlocked: false,
      onOpenMobileTraining: vi.fn(),
      onOpenAdaptive: vi.fn(),
      onOpenAdaptiveFlow: vi.fn(),
      onOpenAdmin: vi.fn(),
      onOpenOpenRouter: vi.fn(),
      onToggleTheme: vi.fn(),
      onSignOut: vi.fn(),
    },
    sessionCreationMode: null,
    sessionCreateCardProps: {} as never,
    pendingSessions: [],
    activeSessionId: '',
    openWorkspaceForSession: vi.fn(),
    deleteSession: vi.fn(),
    workspaceMode,
    dashboardSession: null,
    sessions: [],
    formatSessionStatus: (status) => status,
    formatSessionDate: (value) => value,
    formatSessionPlaybackDuration: () => '0s',
    adaptiveBenchmarkSectionProps: createCollapsedAdaptiveBenchmarkProps(),
    openRouterAccessState: 'denied',
    openRouterAccessMessage: 'OpenRouter unavailable',
    openRouterWorkspaceProps: {} as never,
    canAccessAdminWorkspace: false,
    adminWorkspaceProps: {} as never,
    showLeaderboardWorkspace: vi.fn(),
    liveMetricsDockProps,
  };
}

function createCollapsedAdaptiveBenchmarkProps(): ComponentProps<typeof AdaptiveBenchmarkSection> {
  return {
    adapters: [],
    benchmarks: {} as never,
    expanded: false,
    onToggleExpanded: vi.fn(),
    selectedInputMode: 'browser-tts',
    selectedLanguage: 'de',
    selectedProfile: { inputMode: 'browser-tts', language: 'de' } as never,
    repeatWordStats: [],
    formatSessionDate: (value) => value,
    onSelect: vi.fn(),
    benchmarkExportMessage: '',
    sessionFeedback: null,
    sessionFeedbackMessage: '',
    onCopyBenchmark: vi.fn(),
    onExportBenchmark: vi.fn(),
    onCopyScriptPrompt: vi.fn(),
    onCopyBenchmarkWithScriptPrompt: vi.fn(),
    onCopyScriptTemplate: vi.fn(),
    onCopySessionFeedback: vi.fn(),
    onCopyBenchmarkFeedback: vi.fn(),
    onCopyBenchmarkFeedbackPrompt: vi.fn(),
    onCopyBenchmarkFeedbackPromptWithHumanFeedback: vi.fn(),
  };
}

function createLiveMetricsDockProps(): LiveMetricsDockProps {
  return {
    insightsCollapsed: false,
    metricsLanguageView: 'de',
    metricsRangeView: 'today',
    trend: 'stable',
    insightsDiagnosticInputOptions: [{ inputMode: 'browser-tts', label: 'Browser TTS' }],
    insightsDiagnosticInputMode: 'browser-tts',
    insightsDiagnosticMessage: '',
    insightsDiagnosticFallbackReport: '',
    lastSessionForLanguage: null,
    lastSessionScoreHelpText: '',
    languageTodaySummary: {
      sessionsInRange: [],
      durationSeconds: 0,
      avgPoints: null,
      avgScore: null,
      avgAccuracy: null,
      avgWpm: null,
      days: [{ label: 'Today', count: 0 }],
      maxDayCount: 1,
    },
    onChangeMetricsLanguageView: vi.fn(),
    onChangeMetricsRangeView: vi.fn(),
    onChangeInsightsDiagnosticInputMode: vi.fn(),
    onCopyInsightsDiagnosticPackage: vi.fn(),
    onToggleInsightsCollapsed: vi.fn(),
    onSelectInsightsDiagnosticFallbackReport: vi.fn(),
    formatInputModeLabel: () => 'Browser TTS',
    formatSessionInputMode: () => 'Browser TTS',
    formatDuration: (seconds) => `${seconds}s`,
    formatSessionDate: (value) => value,
  };
}
