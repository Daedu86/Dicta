// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadOpenRouterDirectGenerationDurationMinutes,
  persistOpenRouterDirectGenerationDurationMinutes,
} from '../src/app/uiPreferenceStorage';

const OPEN_ROUTER_DIRECT_GENERATION_DURATION_KEY = 'dicta.openRouterDirectGenerationDuration.v1';

describe('uiPreferenceStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('loads the default OpenRouter direct generation duration when no preference exists', () => {
    expect(loadOpenRouterDirectGenerationDurationMinutes()).toBe(3);
  });

  it('persists the OpenRouter direct generation duration preference', () => {
    persistOpenRouterDirectGenerationDurationMinutes(10);

    expect(loadOpenRouterDirectGenerationDurationMinutes()).toBe(10);
    expect(window.localStorage.getItem(OPEN_ROUTER_DIRECT_GENERATION_DURATION_KEY)).toBe('10');
  });

  it('falls back to the default duration when the stored value is invalid', () => {
    window.localStorage.setItem(OPEN_ROUTER_DIRECT_GENERATION_DURATION_KEY, '11');

    expect(loadOpenRouterDirectGenerationDurationMinutes()).toBe(3);
  });
});
