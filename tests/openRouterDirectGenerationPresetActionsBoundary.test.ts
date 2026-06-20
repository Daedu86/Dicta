import { describe, expect, it } from 'vitest';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('OpenRouter direct generation preset actions boundary', () => {
  it('uses one adaptive direct generation preset', () => {
    expect(Object.keys(OPEN_ROUTER_DIRECT_GENERATION_PRESETS)).toEqual(['adaptive']);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.userIntent).toBe('auto');
  });
});
