import { describe, expect, it } from 'vitest';
import { resolveEffectiveOpenRouterDefaultModel } from '../src/app/useWorkspaceModelRefreshRuntime';

describe('resolveEffectiveOpenRouterDefaultModel', () => {
  it('uses the assigned OpenRouter model for authenticated member profiles', () => {
    expect(
      resolveEffectiveOpenRouterDefaultModel({
        syncConfig: { authRequired: true },
        appProfile: {
          role: 'member',
          assignedOpenRouterModel: '  openai/gpt-4.1-mini  ',
        },
        openRouterDefaultModel: 'anthropic/claude-3.5-haiku',
      }),
    ).toEqual({
      assignedOpenRouterModel: 'openai/gpt-4.1-mini',
      effectiveOpenRouterDefaultModel: 'openai/gpt-4.1-mini',
    });
  });

  it('falls back to the user default model when no assigned member model exists', () => {
    expect(
      resolveEffectiveOpenRouterDefaultModel({
        syncConfig: { authRequired: true },
        appProfile: {
          role: 'member',
          assignedOpenRouterModel: '   ',
        },
        openRouterDefaultModel: 'anthropic/claude-3.5-haiku',
      }),
    ).toEqual({
      assignedOpenRouterModel: '',
      effectiveOpenRouterDefaultModel: 'anthropic/claude-3.5-haiku',
    });
  });

  it('ignores assigned models when auth is not required', () => {
    expect(
      resolveEffectiveOpenRouterDefaultModel({
        syncConfig: { authRequired: false },
        appProfile: {
          role: 'member',
          assignedOpenRouterModel: 'openai/gpt-4.1-mini',
        },
        openRouterDefaultModel: 'anthropic/claude-3.5-haiku',
      }),
    ).toEqual({
      assignedOpenRouterModel: '',
      effectiveOpenRouterDefaultModel: 'anthropic/claude-3.5-haiku',
    });
  });

  it('ignores assigned models for non-member profiles', () => {
    expect(
      resolveEffectiveOpenRouterDefaultModel({
        syncConfig: { authRequired: true },
        appProfile: {
          role: 'admin',
          assignedOpenRouterModel: 'openai/gpt-4.1-mini',
        },
        openRouterDefaultModel: 'anthropic/claude-3.5-haiku',
      }),
    ).toEqual({
      assignedOpenRouterModel: '',
      effectiveOpenRouterDefaultModel: 'anthropic/claude-3.5-haiku',
    });
  });

  it('falls back to the user default model when the profile is null', () => {
    expect(
      resolveEffectiveOpenRouterDefaultModel({
        syncConfig: { authRequired: true },
        appProfile: null,
        openRouterDefaultModel: 'anthropic/claude-3.5-haiku',
      }),
    ).toEqual({
      assignedOpenRouterModel: '',
      effectiveOpenRouterDefaultModel: 'anthropic/claude-3.5-haiku',
    });
  });

  it('falls back to the user default model when the profile is undefined', () => {
    expect(
      resolveEffectiveOpenRouterDefaultModel({
        syncConfig: { authRequired: true },
        appProfile: undefined,
        openRouterDefaultModel: 'anthropic/claude-3.5-haiku',
      }),
    ).toEqual({
      assignedOpenRouterModel: '',
      effectiveOpenRouterDefaultModel: 'anthropic/claude-3.5-haiku',
    });
  });
});
