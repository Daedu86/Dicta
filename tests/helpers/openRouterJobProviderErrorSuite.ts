import { expect, it } from 'vitest';
import {
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
} from '../../api/openrouter/jobs.js';

const transientProviderFailure = {
  ok: false,
  status: 503,
  body: JSON.stringify({
    error: {
      message: 'Provider returned error',
      code: 503,
      metadata: {
        raw: 'no healthy upstream',
        provider_name: 'OpenInference',
        is_byok: false,
      },
    },
    user_id: 'user_360ls8gD0nDOmwcRgJr92fqM1Fk',
  }),
};

export function defineOpenRouterJobProviderErrorTests() {
  it('treats OpenRouter 503 provider upstream failures as retryable', () => {
    expect(isRetryableOpenRouterJobResponse(transientProviderFailure)).toBe(true);
  });

  it('formats transient provider failures without leaking OpenRouter user ids', () => {
    const message = formatOpenRouterJobProviderError(
      transientProviderFailure,
      [
        { attempt: 1, model: 'openai/gpt-oss-120b:free', status: 503, retryable: true },
        { attempt: 2, model: 'openai/gpt-oss-120b:free', status: 503, retryable: true },
        { attempt: 3, model: 'google/gemma-3n-e2b-it:free', status: 503, retryable: true },
      ],
    );

    expect(message).toContain('OpenRouter provider error (503 from OpenInference): no healthy upstream.');
    expect(message).toContain('Retried 2 times.');
    expect(message).toContain('Tried 2 models.');
    expect(message).not.toContain('user_360ls8gD0nDOmwcRgJr92fqM1Fk');
  });
}
