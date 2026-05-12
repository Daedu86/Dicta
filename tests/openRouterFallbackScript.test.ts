import { describe, expect, it } from 'vitest';
import { validateDictationScript } from '../src/core/adaptive/dictationScriptValidation';
import {
  buildFallbackOpenRouterSessionScript,
  isTransientGenerationErrorSessionLike,
  isTransientOpenRouterGenerationError,
} from '../src/core/adaptive/openRouterFallbackScript';

describe('OpenRouter fallback script helpers', () => {
  it('builds a valid German browser TTS fallback session', () => {
    const script = buildFallbackOpenRouterSessionScript({
      inputMode: 'browser-tts',
      language: 'de',
      durationMinutes: 2,
      targetDifficulty: 'hard',
    });

    expect(script.inputMode).toBe('browser-tts');
    expect(script.language).toBe('de');
    expect(script.estimatedDurationSec).toBe(120);
    expect(script.phrases).toHaveLength(12);
    expect(validateDictationScript(script).ok).toBe(true);
  });

  it('treats Vercel and mobile network failures as transient OpenRouter errors', () => {
    expect(isTransientOpenRouterGenerationError('Failed to fetch')).toBe(true);
    expect(isTransientOpenRouterGenerationError('Failed to reach OpenRouter endpoint. Refresh and retry.')).toBe(true);
    expect(isTransientOpenRouterGenerationError('An error occurred with your deployment FUNCTION_INVOCATION_TIMEOUT fra1::abc')).toBe(true);
    expect(isTransientOpenRouterGenerationError('OpenRouter timed out before Vercel could finish the request.')).toBe(true);
  });

  it('does not hide schema validation failures as transient platform errors', () => {
    expect(isTransientOpenRouterGenerationError('Generated script did not validate. phrases must be a non-empty array.')).toBe(false);
    expect(isTransientGenerationErrorSessionLike({
      name: 'Direct session generation error',
      status: 'error',
      generationError: 'Generated script did not validate. phrases must be a non-empty array.',
    })).toBe(false);
  });

  it('identifies old synced platform timeout error sessions for cleanup', () => {
    expect(isTransientGenerationErrorSessionLike({
      name: 'Advanced direct session generation error',
      status: 'error',
      generationError: 'An error occurred with your deployment FUNCTION_INVOCATION_TIMEOUT fra1::s',
    })).toBe(true);
  });
});
