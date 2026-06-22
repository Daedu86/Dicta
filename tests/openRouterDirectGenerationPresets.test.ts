import { describe, expect, it } from 'vitest';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('OPEN_ROUTER_DIRECT_GENERATION_PRESETS', () => {
  const presetEntries = Object.entries(OPEN_ROUTER_DIRECT_GENERATION_PRESETS);

  it('contains exactly the supported direct presets', () => {
    expect(Object.keys(OPEN_ROUTER_DIRECT_GENERATION_PRESETS)).toEqual([
      'adaptive',
      'topic',
    ]);

    expect(presetEntries.map(([, preset]) => preset.id)).toEqual([
      'adaptive',
      'topic',
    ]);
  });

  it('keeps direct presets at three minutes', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.durationMinutes).toBe(3);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic.durationMinutes).toBe(3);
  });

  it('requests the highest safe level and lets the trainer downgrade if needed', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive).toMatchObject({
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic).toMatchObject({
      userIntent: 'challenge',
      targetDifficulty: 'hard',
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
    expect(displayLabels).toEqual(['Adaptive session', 'Topic session']);
  });
});
