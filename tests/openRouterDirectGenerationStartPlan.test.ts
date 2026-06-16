import { describe, expect, it } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  buildOpenRouterDirectGenerationStartPlan,
  OPEN_ROUTER_DIRECT_GENERATION_MODEL_REQUIRED_MESSAGE,
  OPEN_ROUTER_DIRECT_GENERATION_OFFLINE_MESSAGE,
} from '../src/app/openRouterDirectGenerationStartPlan';

const baseArgs = {
  activeSessionInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
  fallbackInputMode: 'browser-tts' as const,
  dictaLanguageView: 'de' as const,
  effectiveOpenRouterDefaultModel: ' openrouter/free ',
  isOnline: true,
};

describe('OpenRouter direct generation start plan', () => {
  it('blocks offline generation before model validation', () => {
    expect(buildOpenRouterDirectGenerationStartPlan({
      ...baseArgs,
      effectiveOpenRouterDefaultModel: '   ',
      isOnline: false,
    })).toEqual({
      status: 'error',
      message: OPEN_ROUTER_DIRECT_GENERATION_OFFLINE_MESSAGE,
    });
  });

  it('requires a non-empty default model after trimming whitespace', () => {
    expect(buildOpenRouterDirectGenerationStartPlan({
      ...baseArgs,
      effectiveOpenRouterDefaultModel: '   ',
    })).toEqual({
      status: 'error',
      message: OPEN_ROUTER_DIRECT_GENERATION_MODEL_REQUIRED_MESSAGE,
    });
  });

  it('builds a ready plan from the active session input mode and selected language', () => {
    expect(buildOpenRouterDirectGenerationStartPlan(baseArgs)).toEqual({
      status: 'ready',
      model: 'openrouter/free',
      inputMode: 'browser-tts',
      language: 'de',
    });
  });

  it('uses the fallback input mode when there is no active session', () => {
    expect(buildOpenRouterDirectGenerationStartPlan({
      ...baseArgs,
      activeSessionInputMode: null,
      fallbackInputMode: 'browser-tts',
      dictaLanguageView: 'es',
    })).toEqual({
      status: 'ready',
      model: 'openrouter/free',
      inputMode: 'browser-tts',
      language: 'es',
    });
  });
});
