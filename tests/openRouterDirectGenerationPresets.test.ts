import { describe, expect, it } from 'vitest';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('OPEN_ROUTER_DIRECT_GENERATION_PRESETS', () => {
  const presetEntries = Object.entries(OPEN_ROUTER_DIRECT_GENERATION_PRESETS);

  it('contains exactly the supported standard and express presets', () => {
    expect(Object.keys(OPEN_ROUTER_DIRECT_GENERATION_PRESETS)).toEqual([
      'easy',
      'medium',
      'hard',
      'expressEasy',
      'expressMedium',
      'expressHard',
    ]);

    expect(presetEntries.map(([, preset]) => preset.id)).toEqual([
      'easy',
      'medium',
      'hard',
      'express-easy',
      'express-medium',
      'express-hard',
    ]);
  });

  it('keeps standard presets at two minutes and express presets at one minute', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy.durationMinutes).toBe(2);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium.durationMinutes).toBe(2);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard.durationMinutes).toBe(2);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressEasy.durationMinutes).toBe(1);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressMedium.durationMinutes).toBe(1);
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressHard.durationMinutes).toBe(1);
  });

  it('maps each direct preset to the expected listening intent and stored difficulty', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy).toMatchObject({
      userIntent: 'recover',
      targetDifficulty: 'easy',
    });
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressEasy).toMatchObject({
      userIntent: 'recover',
      targetDifficulty: 'easy',
    });

    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium).toMatchObject({
      userIntent: 'progress',
      targetDifficulty: 'normal',
    });
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressMedium).toMatchObject({
      userIntent: 'progress',
      targetDifficulty: 'normal',
    });

    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard).toMatchObject({
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressHard).toMatchObject({
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });
  });

  it('keeps labels and difficulty instructions populated with unique slot labels', () => {
    const slotLabels = presetEntries.map(([, preset]) => preset.slotLabel);

    for (const [, preset] of presetEntries) {
      expect(preset.slotLabel.trim()).not.toBe('');
      expect(preset.displayLabel.trim()).not.toBe('');
      expect(preset.difficultyInstruction.trim()).not.toBe('');
    }

    expect(new Set(slotLabels).size).toBe(slotLabels.length);
  });
});
