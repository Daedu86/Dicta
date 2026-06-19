import type {
  Dispatch,
  SetStateAction,
} from 'react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createAdaptiveWorkspaceEntryActions,
  type AdaptiveSectionExpandedState,
  type AdaptiveWorkspaceEntryActionsOptions,
} from '../src/app/useAdaptiveWorkspaceEntryActions';
import type { AdaptiveWorkspaceFocusAnchor } from '../src/components/adaptive-workspace/types';
import type { BenchmarkLanguageButton } from '../src/components/openrouter/types';
import type { InputMode } from '../src/core/adaptive/types';
import type { StoredSession } from '../src/app/sessionTypes';

const expandedState: AdaptiveSectionExpandedState = {
  benchmarks: false,
};

function dispatchMock<T>() {
  return vi.fn() as unknown as Dispatch<SetStateAction<T>>;
}

function createActiveSession(): StoredSession {
  return {
    id: 'session-1',
    inputMode: 'browser-tts',
  } as StoredSession;
}

function createHarness(overrides: Partial<AdaptiveWorkspaceEntryActionsOptions> = {}) {
  let adaptiveSectionExpanded = { ...expandedState };
  const setAdaptiveSectionExpanded = vi.fn((next: SetStateAction<AdaptiveSectionExpandedState>) => {
    adaptiveSectionExpanded = typeof next === 'function'
      ? next(adaptiveSectionExpanded)
      : next;
  }) as unknown as Dispatch<SetStateAction<AdaptiveSectionExpandedState>>;

  const options: AdaptiveWorkspaceEntryActionsOptions = {
    activeSession: createActiveSession(),
    dictaLanguageView: 'de' as BenchmarkLanguageButton,
    showAdaptiveWorkspace: vi.fn(),
    setSelectedBenchmarkInputMode: dispatchMock<InputMode>(),
    setSelectedBenchmarkLanguage: dispatchMock<BenchmarkLanguageButton>(),
    setBenchmarkExportMessage: dispatchMock<string>(),
    setSessionFeedbackMessage: dispatchMock<string>(),
    setAdaptiveBenchmarksFocusAnchor: dispatchMock<AdaptiveWorkspaceFocusAnchor>(),
    setAdaptiveSectionExpanded,
    isMobileViewport: vi.fn(() => false),
    ...overrides,
  };

  return {
    options,
    actions: createAdaptiveWorkspaceEntryActions(options),
    getAdaptiveSectionExpanded: () => adaptiveSectionExpanded,
  };
}

describe('adaptive workspace entry actions', () => {
  it('does nothing when opening exports without an active session', () => {
    const { actions, options } = createHarness({
      activeSession: null,
    });

    actions.openAdaptiveExportsForActiveInput();

    expect(options.setSelectedBenchmarkInputMode).not.toHaveBeenCalled();
    expect(options.setSelectedBenchmarkLanguage).not.toHaveBeenCalled();
    expect(options.setBenchmarkExportMessage).not.toHaveBeenCalled();
    expect(options.setSessionFeedbackMessage).not.toHaveBeenCalled();
    expect(options.setAdaptiveBenchmarksFocusAnchor).not.toHaveBeenCalled();
    expect(options.setAdaptiveSectionExpanded).not.toHaveBeenCalled();
    expect(options.showAdaptiveWorkspace).not.toHaveBeenCalled();
  });

  it('opens adaptive exports for the active session and selected language', () => {
    const {
      actions,
      options,
      getAdaptiveSectionExpanded,
    } = createHarness();

    actions.openAdaptiveExportsForActiveInput();

    expect(options.setSelectedBenchmarkInputMode).toHaveBeenCalledWith('browser-tts');
    expect(options.setSelectedBenchmarkLanguage).toHaveBeenCalledWith('de');
    expect(options.setBenchmarkExportMessage).toHaveBeenCalledWith('');
    expect(options.setSessionFeedbackMessage).toHaveBeenCalledWith('');
    expect(options.setAdaptiveBenchmarksFocusAnchor).toHaveBeenCalledWith('exports');
    expect(getAdaptiveSectionExpanded().benchmarks).toBe(true);
    expect(options.showAdaptiveWorkspace).toHaveBeenCalledTimes(1);
  });

  it('opens the adaptive workspace from the header without changing desktop section state', () => {
    const {
      actions,
      options,
      getAdaptiveSectionExpanded,
    } = createHarness({
      isMobileViewport: vi.fn(() => false),
    });

    actions.openAdaptiveWorkspaceFromHeader();

    expect(options.setAdaptiveSectionExpanded).not.toHaveBeenCalled();
    expect(getAdaptiveSectionExpanded()).toEqual(expandedState);
    expect(options.showAdaptiveWorkspace).toHaveBeenCalledTimes(1);
  });

  it('collapses adaptive sections before opening from the mobile header', () => {
    const {
      actions,
      options,
      getAdaptiveSectionExpanded,
    } = createHarness({
      isMobileViewport: vi.fn(() => true),
    });

    actions.openAdaptiveWorkspaceFromHeader();

    expect(options.setAdaptiveSectionExpanded).toHaveBeenCalledTimes(1);
    expect(getAdaptiveSectionExpanded()).toEqual({
      benchmarks: false,
    });
    expect(options.showAdaptiveWorkspace).toHaveBeenCalledTimes(1);
  });
});
