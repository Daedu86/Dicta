import { describe, expect, it } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  buildOpenRouterGenerateWorkspacePlan,
  OPEN_ROUTER_GENERATE_WORKSPACE_OFFLINE_MESSAGE,
} from '../src/app/openRouterGenerateWorkspacePlan';

const baseArgs = {
  activeSessionInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
  allowCustomSessionGeneration: true,
  openRouterAccessAllowed: true,
  openRouterAccessMessage: '',
  isOnline: true,
  dictaLanguageView: 'de' as const,
};

describe('OpenRouter generate workspace plan', () => {
  it('does nothing when there is no active session to seed generation from', () => {
    expect(buildOpenRouterGenerateWorkspacePlan({
      ...baseArgs,
      activeSessionInputMode: null,
    })).toEqual({ status: 'noop', reason: 'missing-active-session' });
  });

  it('blocks non-admin custom generation before checking OpenRouter access', () => {
    expect(buildOpenRouterGenerateWorkspacePlan({
      ...baseArgs,
      allowCustomSessionGeneration: false,
      openRouterAccessAllowed: false,
      openRouterAccessMessage: 'Access should not win.',
    })).toEqual({
      status: 'error',
      message: 'Custom session generation is available to admins only.',
    });
  });

  it('returns the configured OpenRouter access message when access is denied', () => {
    expect(buildOpenRouterGenerateWorkspacePlan({
      ...baseArgs,
      openRouterAccessAllowed: false,
      openRouterAccessMessage: 'OpenRouter is disabled for this profile.',
    })).toEqual({
      status: 'error',
      message: 'OpenRouter is disabled for this profile.',
    });
  });

  it('builds the ready workspace plan from the active session input mode and selected language', () => {
    expect(buildOpenRouterGenerateWorkspacePlan(baseArgs)).toEqual({
      status: 'ready',
      inputMode: 'browser-tts',
      language: 'de',
      offlineErrorMessage: null,
    });
  });

  it('preserves the ready plan while carrying the offline error for the caller to apply after quota checks', () => {
    expect(buildOpenRouterGenerateWorkspacePlan({
      ...baseArgs,
      isOnline: false,
    })).toEqual({
      status: 'ready',
      inputMode: 'browser-tts',
      language: 'de',
      offlineErrorMessage: OPEN_ROUTER_GENERATE_WORKSPACE_OFFLINE_MESSAGE,
    });
  });
});
