import { describe, expect, it } from 'vitest';
import {
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
} from '../api/openrouter/jobs.js';

const providerFailureResponse = {
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
    user_id: 'user_private_id',
  }),
};

describe('OpenRouter jobs route provider errors', () => {
  it('treats OpenRouter 503 provider upstream failures as retryable', () => {
    expect(isRetryableOpenRouterJobResponse(providerFailureResponse)).toBe(true);
  });

  it('formats transient provider failures without leaking OpenRouter user ids', () => {
    const message = formatOpenRouterJobProviderError(providerFailureResponse, [
      { attempt: 1, model: 'provider/primary:free', status: 503, retryable: true },
      { attempt: 2, model: 'provider/primary:free', status: 503, retryable: true },
      { attempt: 3, model: 'provider/fallback:free', status: 503, retryable: true },
    ]);

    expect(message).toContain('OpenRouter provider error (503 from OpenInference): no healthy upstream.');
    expect(message).toContain('Retried 2 times.');
    expect(message).toContain('Tried 2 models.');
    expect(message).not.toContain('user_private_id');
  });
});
