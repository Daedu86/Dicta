// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveMetricsDock } from '../src/components/runtime-workspaces/LiveMetricsDock';
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

describe('LiveMetricsDock', () => {
  it('does not render the Browser TTS status player in the dashboard insights dock', () => {
    act(() => {
      root.render(createElement(LiveMetricsDock, createProps()));
    });

    expect(host.querySelector('.bottom-metrics-dock')).not.toBeNull();
    expect(host.querySelector('.tts-bottom-player')).toBeNull();
    expect(host.querySelector('.bottom-metrics-player')).toBeNull();
    expect(host.querySelector('.bottom-metrics-player-label')).toBeNull();

    const topSectionChildren = host.querySelector('.bottom-metrics-top')?.children;
    expect(topSectionChildren).toHaveLength(1);
    expect(topSectionChildren?.[0]?.classList.contains('live-metrics-section-header')).toBe(true);
  });

  it('groups the insights header controls into a single row without the diagnostic input selector', () => {
    act(() => {
      root.render(createElement(LiveMetricsDock, createProps()));
    });

    const headingRow = host.querySelector('.live-metrics-heading-row');
    const headerChildClasses = Array.from(headingRow?.children ?? []).map((child) => child.className);

    expect(headingRow?.querySelector('h2')?.textContent).toBe('Insights');
    expect(headingRow?.querySelector('.trend')?.textContent).toBe('Stable');
    expect(headingRow?.querySelectorAll('.live-metrics-language-tab')).toHaveLength(5);
    expect(headerChildClasses).toEqual([
      'live-metrics-title-group',
      'live-metrics-language-tabs',
      'live-metrics-action-group',
    ]);
    expect(host.querySelector('.live-metrics-control-row')).toBeNull();
    expect(headingRow?.querySelector('.live-metrics-input-tabs')).toBeNull();
    expect(headingRow?.querySelector('.live-metrics-input-tab')).toBeNull();
    expect(headingRow?.querySelector('.live-metrics-report-button')).toBeNull();
  });
});

function createProps(overrides: Partial<LiveMetricsDockProps> = {}): LiveMetricsDockProps {
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
    ...overrides,
  };
}
