import { describe, expect, it } from 'vitest';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('buildOpenRouterDirectGenerationJobPlan', () => {
  it('uses the adaptive preset for direct session generation', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.id).toBe('adaptive');
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.targetDifficulty).toBe('hard');
  });
});
