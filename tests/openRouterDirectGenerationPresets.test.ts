import { describe, expect, it } from 'vitest';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('OPEN_ROUTER_DIRECT_GENERATION_PRESETS', () => {
  const presetEntries = Object.entries(OPEN_ROUTER_DIRECT_GENERATION_PRESETS);

  it('contains exactly the supported direct preset', () => {
    expect(Object.keys(OPEN_ROUTER_DIRECT_GENERATION_PRESETS)).toEqual([
      'adaptive',
    ]);

    expect(presetEntries.map(([, preset]) => preset.id)).toEqual([
      'adaptive',
    ]);
  });

  it('keeps the adaptive direct preset at two minutes', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.durationMinutes).toBe(2);
  });

  it('lets the trainer resolve the final mode and difficulty', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive).toMatchObject({
      userIntent: 'auto',
      targetDifficulty: 'normal',
    });
  });

  it('keeps canonical display labels and populated difficulty instructions', () => {
    const slotLabels = presetEntries.map(([, preset]) => preset.slotLabel);
    const displayLabels = presetEntries.map(([, preset]) => preset.displayLabel);

    for (const [, preset] of presetEntries) {
      expect(preset.slotLabel.trim()).not.toBe('');
      expect(preset.displayLabel.trim()).not.toBe('');
      expect(preset.difficultyInstruction.trim()).not.toBe('');
    }

    expect(new Set(slotLabels).size).toBe(slotLabels.length);
    expect(displayLabels).toEqual(['Adaptive session']);
  });
});
