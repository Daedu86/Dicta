import { describe, expect, it } from 'vitest';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('OpenRouter direct generation preset actions boundary', () => {
  it('uses the supported adaptive and topic direct generation presets', () => {
    expect(Object.keys(OPEN_ROUTER_DIRECT_GENERATION_PRESETS)).toEqual(['adaptive', 'topic']);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.userIntent).toBe('challenge');
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic.userIntent).toBe('challenge');
  });
});
