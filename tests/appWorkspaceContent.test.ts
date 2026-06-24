// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppWorkspaceContent } from '../src/app/AppWorkspaceContent';
import type { StoredSession } from '../src/app/sessionTypes';
import { DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS } from '../src/app/browserTtsNextChunkScheduler';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import type { AdminWorkspaceProps } from '../src/components/admin/AdminWorkspace';
import type { OpenRouterWorkspaceProps } from '../src/components/openrouter/types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  window.history.replaceState(null, '', '/');
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

  it('renders the adaptive pace layer flow workspace with language tabs and the visible implementation cycle', () => {
    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        pendingSessions: [createPendingSession()],
        workspaceMode: 'adaptive-flow',
      })));
    });

    expect(host.querySelector('[aria-label="Pending sessions"]')).toBeNull();
    expect(host.textContent).toContain('Adaptive Pace Layer Flow');
    expect(host.textContent).toContain('Implementation cycle');
    expect(host.textContent).toContain('memoria → preparar → ejecutar → aprender → siguiente vuelta');
    const languageButtons = host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-language-button');
    expect(languageButtons).toHaveLength(5);
    expect(languageButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('browser-tts/en');
    expect(host.querySelectorAll('.adaptive-flow-phase-kpi')).toHaveLength(27);
    expect(host.querySelector('.adaptive-flow-insights-card')).toBeNull();
    const runtimeMapCard = host.querySelector<HTMLElement>('.adaptive-flow-runtime-map-card');
    const runtimeLoopCard = host.querySelector<HTMLElement>('.adaptive-flow-language-card');
    const phaseCycle = host.querySelector<HTMLElement>('.adaptive-flow-cycle');
    expect(runtimeMapCard).not.toBeNull();
    expect(runtimeLoopCard).not.toBeNull();
    expect(phaseCycle).not.toBeNull();
    const runtimeMapPosition = runtimeMapCard?.compareDocumentPosition(runtimeLoopCard as Node) ?? 0;
    const runtimeLoopPosition = runtimeLoopCard?.compareDocumentPosition(phaseCycle as Node) ?? 0;
    expect(Boolean(runtimeMapPosition & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(runtimeLoopPosition & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(host.textContent).toContain('Pipeline + brain');
    expect(host.textContent).toContain('Ciclo cerrado del Adaptive Pace Layer');
    expect(host.textContent).toContain('Adaptive Runtime / Pace Layer');
    expect(host.textContent).toContain('Benchmark + feedback reciente');
    expect(host.textContent).toContain('Preparar próxima sesión');
    expect(host.textContent).toContain('Evidencia entra');
    expect(host.textContent).toContain('Decisión / salida');
    expect(host.textContent).toContain('siguiente vuelta');
    expect(host.textContent).toContain('Señales en vivo');
    expect(host.querySelector('.adaptive-flow-runtime-cycle-center')).not.toBeNull();
    expect(host.querySelectorAll('.adaptive-flow-runtime-cycle-node')).toHaveLength(4);
    const runtimePhaseChips = host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-runtime-phase-chip');
    expect(runtimePhaseChips).toHaveLength(10);
    expect(Array.from(runtimePhaseChips).some((chip) => chip.textContent === 'Planner')).toBe(true);
    expect(host.querySelector('.adaptive-flow-cycle')).not.toBeNull();
    expect(host.querySelectorAll('.adaptive-flow-phase-card')).toHaveLength(9);
    expect(host.querySelector('.adaptive-flow-cycle-workspace')).toBeNull();
    const phaseButtons = host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-phase-open-button');
    expect(phaseButtons).toHaveLength(9);
    expect(host.textContent).toContain('Step 1');
    expect(host.textContent).toContain('Generation');
    expect(host.textContent).toContain('Planner');
    expect(host.textContent).toContain('Chunker');
    expect(host.textContent).toContain('Browser TTS');
    expect(host.textContent).toContain('Telemetry');
    expect(host.textContent).toContain('Benchmark');
    expect(host.textContent).toContain('Step 9');
    expect(host.textContent).toContain('Adaptation');

    const plannerRuntimeChip = Array.from(runtimePhaseChips).find((chip) => chip.textContent === 'Planner');
    expect(plannerRuntimeChip).not.toBeUndefined();

    act(() => {
      plannerRuntimeChip?.click();
    });

    expect(window.location.hash).toBe('#adaptive-flow/planner');
    expect(host.querySelector('.adaptive-flow-cycle')).toBeNull();
    expect(host.querySelector('.adaptive-flow-phase-page')).not.toBeNull();
    expect(host.textContent).toContain('Step 2 workspace');
    expect(host.textContent).toContain('Operational metrics');
    expect(host.textContent).toContain('Related files');
    expect(host.textContent).toContain('target playback rate');
    expect(host.textContent).toContain('src/core/adaptive/ListeningTrainerPolicy.ts');

    const phaseLanguageButtons = host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-language-button');
    act(() => {
      phaseLanguageButtons[1].click();
    });

    expect(phaseLanguageButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(phaseLanguageButtons[1].getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Spanish');
    expect(host.textContent).toContain('browser-tts/es');
    expect(host.textContent).not.toContain('browser-tts/en');

    const backButton = host.querySelector<HTMLButtonElement>('.adaptive-flow-back-button');
    expect(backButton).not.toBeNull();

    act(() => {
      backButton?.click();
    });

    expect(window.location.hash).toBe('#adaptive-flow');
    expect(host.querySelector('.adaptive-flow-phase-page')).toBeNull();
    expect(host.querySelector('.adaptive-flow-cycle')).not.toBeNull();
    expect(host.querySelectorAll('.adaptive-flow-phase-card')).toHaveLength(9);
  });

  it('opens an adaptive flow phase subpage directly from the phase hash route', () => {
    window.history.replaceState(null, '', '/#adaptive-flow/benchmark');

    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        workspaceMode: 'adaptive-flow',
      })));
    });

    expect(host.querySelector('.adaptive-flow-phase-page')).not.toBeNull();
    expect(host.querySelector('.adaptive-flow-cycle')).toBeNull();
    expect(host.textContent).toContain('Step 8 workspace');
    expect(host.textContent).toContain('Benchmark');
    expect(host.textContent).toContain('KPIs');
    expect(host.textContent).toContain('Operational metrics');
    expect(host.textContent).toContain('Related files');
    expect(host.textContent).toContain('src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts');
  });

  it('renders the live OpenRouter generation card inside adaptive flow phase 1 when access is allowed', () => {
    const onChangeDirectGenerationDurationMinutes = vi.fn();
    window.history.replaceState(null, '', '/#adaptive-flow/generation');

    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        workspaceMode: 'adaptive-flow',
        openRouterAccessState: 'allowed',
        openRouterWorkspaceProps: createOpenRouterWorkspaceProps({
          onChangeDirectGenerationDurationMinutes,
        }),
      })));
    });

    expect(host.querySelector('.adaptive-flow-phase-page')).not.toBeNull();
    expect(host.textContent).toContain('Step 1 workspace');
    expect(host.textContent).toContain('Generate Training Session');
    expect(host.textContent).toContain('Prompt sent to OpenRouter');
    expect(host.textContent).toContain('Target');
    expect(host.textContent).toContain('browser-tts/en');
    expect(host.textContent).toContain('compact-adaptive-v2');
    expect(host.querySelector('#adaptive-flow-generation-session-card')).not.toBeNull();
    expect(host.querySelector('.adaptive-flow-generation-live-card')).not.toBeNull();
    const durationButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-direct-duration-button'));
    expect(durationButtons.map((button) => button.textContent)).toEqual(['2 min', '3 min', '4 min', '5 min', '6 min']);
    expect(durationButtons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false', 'false']);

    act(() => {
      durationButtons[4].click();
    });

    expect(onChangeDirectGenerationDurationMinutes).toHaveBeenCalledWith(6);

    const actionButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-direct-generation-button'));
    expect(actionButtons.map((button) => button.textContent)).toEqual(['Prompt generation', 'Prompt generation + my context']);
    expect(actionButtons[0].disabled).toBe(false);
    expect(actionButtons[1].disabled).toBe(true);

    const contextTextarea = host.querySelector<HTMLTextAreaElement>('#adaptive-flow-direct-context');
    expect(contextTextarea).not.toBeNull();

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      valueSetter?.call(contextTextarea, '  Berlin   appointment   vocabulary  ');
      contextTextarea!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const updatedActionButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-direct-generation-button'));
    expect(updatedActionButtons[1].disabled).toBe(false);

    const previewTabs = Array.from(host.querySelectorAll<HTMLButtonElement>('.adaptive-flow-direct-preview-tab'));
    act(() => {
      previewTabs[1].click();
    });

    expect(host.textContent).toContain('User topic context:');
    expect(host.textContent).toContain('Berlin appointment vocabulary');
  });

  it('edits safe chunk pause gate settings inside adaptive flow phase 5', () => {
    const onSaveSafePauseGateSettings = vi.fn();
    window.history.replaceState(null, '', '/#adaptive-flow/playback-loop');

    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        workspaceMode: 'adaptive-flow',
        safePauseGateSettings: {
          minimumMentalRestMs: 700,
          completionGateMaxWaitMs: 4000,
        },
        onSaveSafePauseGateSettings,
      })));
    });

    expect(host.querySelector('.adaptive-flow-phase-page')).not.toBeNull();
    expect(host.textContent).toContain('Step 5 workspace');
    expect(host.textContent).toContain('Safe chunk pause gate');
    expect(host.textContent).toContain('Minimum mental rest');
    expect(host.textContent).toContain('Completion gate');
    expect(host.textContent).toContain('Max fallback');

    const minimumInput = host.querySelector<HTMLInputElement>('#adaptive-flow-minimum-mental-rest-ms');
    const fallbackInput = host.querySelector<HTMLInputElement>('#adaptive-flow-completion-gate-max-wait-ms');
    expect(minimumInput?.value).toBe('700');
    expect(fallbackInput?.value).toBe('4000');

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(minimumInput, '900');
      minimumInput!.dispatchEvent(new Event('input', { bubbles: true }));
      valueSetter?.call(fallbackInput, '3000');
      fallbackInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const saveButton = host.querySelector<HTMLButtonElement>('.adaptive-flow-safe-pause-gate-save-button');
    act(() => {
      saveButton?.click();
    });

    expect(onSaveSafePauseGateSettings).toHaveBeenCalledWith({
      minimumMentalRestMs: 900,
      completionGateMaxWaitMs: 3000,
    });
    expect(host.textContent).toContain('Saved locally for Browser TTS playback.');
  });

  it('keeps Generate Training Session and export/copy actions out of the OpenRouter workspace', () => {
    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        workspaceMode: 'openrouter',
        openRouterAccessState: 'allowed',
        openRouterWorkspaceProps: createOpenRouterWorkspaceProps(),
        canAccessAdminWorkspace: true,
        adminWorkspaceProps: createAdminWorkspaceProps(),
      })));
    });

    expect(host.textContent).toContain('Admin');
    expect(host.textContent).toContain('Overview');
    expect(host.textContent).toContain('OpenRouter');
    expect(host.textContent).toContain('Section # 1 API Key');
    expect(host.textContent).toContain('Section # 2 Free Models');
    expect(host.textContent).toContain('Section # 3 Testing model');
    expect(host.textContent).not.toContain('Section # 4 Export / Copy Actions');
    expect(host.textContent).not.toContain('Copy Benchmark JSON');
    expect(host.textContent).not.toContain('Section # 5 Generate Training Session');
    expect(host.textContent).not.toContain('Prompt sent to OpenRouter');
  });

  it('shows OpenRouter access state in adaptive flow phase 1 without mounting generation controls', () => {
    window.history.replaceState(null, '', '/#adaptive-flow/generation');

    act(() => {
      root.render(createElement(AppWorkspaceContent, buildWorkspaceContentProps({
        workspaceMode: 'adaptive-flow',
        openRouterAccessState: 'pending',
        openRouterAccessMessage: 'OpenRouter unavailable',
        openRouterWorkspaceProps: createOpenRouterWorkspaceProps(),
      })));
    });

    expect(host.textContent).toContain('Generate Training Session');
    expect(host.textContent).toContain('Checking OpenRouter access...');
    expect(host.textContent).not.toContain('Prompt sent to OpenRouter');
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
    openRouterAccessState: 'denied',
    openRouterAccessMessage: '',
    openRouterWorkspaceProps: {} as never,
    safePauseGateSettings: DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS,
    onSaveSafePauseGateSettings: vi.fn(),
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

function createOpenRouterWorkspaceProps(overrides: Partial<OpenRouterWorkspaceProps> = {}): OpenRouterWorkspaceProps {
  const benchmark = createEmptyInputLanguageBenchmark('browser-tts', 'en');

  return {
    defaultModel: 'openrouter/free',
    assignedModel: null,
    authHeaders: {},
    onSetDefaultModel: vi.fn(),
    models: [],
    status: 'ready',
    error: '',
    onRefreshModels: vi.fn(async () => undefined),
    onBackToTraining: vi.fn(),
    sessions: [],
    benchmarks: {
      'browser-tts': {
        en: benchmark,
      },
    },
    sessionFeedbackByInputLanguage: {},
    recentDictationSessionHints: [],
    defaultGenerateInputMode: 'browser-tts',
    defaultGenerateLanguage: 'en',
    directGenerationDurationMinutes: 3,
    onChangeDirectGenerationDurationMinutes: vi.fn(),
    isOnline: true,
    openRouterOfflineTitle: '',
    adaptiveOpenRouterBusy: false,
    topicOpenRouterBusy: false,
    onGenerateAdaptiveDirectSession: vi.fn(),
    onGenerateTopicDirectSession: vi.fn(),
    focusGenerateRequest: 0,
    activeJobs: [],
    jobNotifications: {},
    generationNowMs: Date.parse('2026-06-23T00:00:00.000Z'),
    onTrackJob: vi.fn(),
    onCreateGenerationErrorSession: vi.fn(),
    ...overrides,
  };
}

function createAdminWorkspaceProps(overrides: Partial<AdminWorkspaceProps<StoredSession>> = {}): AdminWorkspaceProps<StoredSession> {
  return {
    sessions: [],
    summary: {
      sessionCount: 0,
      finishedSessions: 0,
      inputModeCounts: { [BROWSER_TTS_SESSION_INPUT_MODE]: 0 },
      dictaLocalStorageBytes: 0,
      ttsTextChars: 0,
      typedTextChars: 0,
      telemetrySamples: 0,
      telemetryActions: 0,
      ttsChunks: 0,
      localStorageEntries: [],
    },
    fileInventory: null,
    fileInventoryError: '',
    exportMessage: '',
    syncStatus: {
      enabled: true,
      state: 'synced',
      message: 'Synced',
      lastSyncedAt: null,
      imported: 0,
      pushed: 0,
    },
    languageView: 'en',
    onChangeLanguage: vi.fn(),
    onBackToTraining: vi.fn(),
    onOpenOverview: vi.fn(),
    onOpenOpenRouter: vi.fn(),
    onCopyLocalStorage: vi.fn(),
    onExportLocalStorage: vi.fn(),
    onImportLocalStorage: vi.fn(),
    onExportSession: vi.fn(),
    onCopySession: vi.fn(),
    appProfile: {
      userId: 'user-1',
      profileId: 'admin',
      displayName: 'Admin',
      role: 'admin',
      active: true,
      canAccessOpenRouter: true,
      assignedOpenRouterModel: null,
      sessionLimit: null,
    },
    visibleProfiles: [],
    profileSessionCounts: {},
    selectedProfileFilter: 'self',
    onChangeProfileFilter: vi.fn(),
    onUpdateProfileAccess: vi.fn(async (profile) => profile),
    authHeaders: {},
    remoteAdminStatus: '',
    openRouterModels: [],
    openRouterModelStatus: 'ready',
    openRouterModelError: '',
    onRefreshOpenRouterModels: vi.fn(async () => undefined),
    ...overrides,
  };
}
