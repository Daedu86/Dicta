import { expect, it } from 'vitest';
import { resolveOpenRouterJobModelCandidates } from '../../api/openrouter/jobs.js';

export function defineOpenRouterJobModelTests() {
  it('keeps an explicitly selected free model as the only durable job candidate', () => {
    expect(resolveOpenRouterJobModelCandidates('z-ai/glm-4.5-air:free')).toEqual(['z-ai/glm-4.5-air:free']);
  });

  it('does not add app-level fallback candidates to the generic free router', () => {
    expect(resolveOpenRouterJobModelCandidates('openrouter/free')).toEqual(['openrouter/free']);
  });
}
