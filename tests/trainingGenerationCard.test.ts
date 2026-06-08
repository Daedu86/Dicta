import { describe, expect, it } from 'vitest';
import {
  buildTrainingGenerationButtonDisplay,
  type TrainingGenerationButton,
} from '../src/components/training/TrainingGenerationCard';

function button(partial: Partial<TrainingGenerationButton> & Pick<TrainingGenerationButton, 'id' | 'label'>): TrainingGenerationButton {
  return {
    onClick: () => undefined,
    disabled: false,
    title: 'legacy title',
    ...partial,
  };
}

describe('TrainingGenerationCard intent labels', () => {
  it('renames standard mobile generation buttons to listening-first intents', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'easy', label: 'New Easy Session' })).displayLabel).toBe('Precision');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'medium', label: 'New Medium Session' })).displayLabel).toBe('Stabilize');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'hard', label: 'New Hard Session' })).displayLabel).toBe('Challenge');
  });

  it('renames express generation buttons while preserving express duration', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-easy', label: 'Express Easy Session' })).displayLabel).toBe('Express Precision');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-medium', label: 'Express Medium Session' })).displayLabel).toBe('Express Stabilize');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-hard', label: 'Express Hard Session' })).displayLabel).toBe('Express Challenge');
  });

  it('renames loading states to the same intent vocabulary', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'easy', label: 'Requesting easy...' })).displayLabel).toBe('Requesting Precision...');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-medium', label: 'Generating express medium...' })).displayLabel).toBe('Generating Express Stabilize...');
  });

  it('keeps custom generation unchanged', () => {
    const display = buildTrainingGenerationButtonDisplay(button({
      id: 'custom',
      label: 'New Custom Session',
      title: 'Open custom generator.',
      helpText: 'Custom help.',
    }));

    expect(display.displayLabel).toBe('New Custom Session');
    expect(display.displayTitle).toBe('Open custom generator.');
    expect(display.displayHelpText).toBe('Custom help.');
  });
});
