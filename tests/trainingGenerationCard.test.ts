import { describe, expect, it } from 'vitest';
import {
  buildTrainingGenerationButtonDisplay,
  type TrainingGenerationButton,
} from '../src/components/training/trainingGenerationDisplay';

function button(partial: Partial<TrainingGenerationButton> & Pick<TrainingGenerationButton, 'id' | 'label'>): TrainingGenerationButton {
  return {
    onClick: () => undefined,
    disabled: false,
    title: 'legacy title',
    ...partial,
  };
}

describe('TrainingGenerationCard intent labels', () => {
  it('keeps the adaptive generation label and queue count visible', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'adaptive', label: 'Generate Session' })).displayLabel).toBe('Generate Session');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'adaptive', label: 'Generate Session (2/3)' })).displayLabel).toBe('Generate Session (2/3)');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'adaptive', label: 'Generating sessions (3/3)' })).displayLabel).toBe('Generating sessions (3/3)');
  });

  it('renames legacy generation buttons to listening-first intents', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'easy', label: 'New Easy Session' })).displayLabel).toBe('Precision');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'medium', label: 'New Medium Session' })).displayLabel).toBe('Stabilize');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'hard', label: 'New Hard Session' })).displayLabel).toBe('Challenge');
  });

  it('maps legacy express generation buttons to the canonical intent labels', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-easy', label: 'Express Easy Session' })).displayLabel).toBe('Precision');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-medium', label: 'Express Medium Session' })).displayLabel).toBe('Stabilize');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-hard', label: 'Express Hard Session' })).displayLabel).toBe('Challenge');
  });

  it('renames loading states to the same intent vocabulary for legacy buttons', () => {
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'easy', label: 'Requesting easy...' })).displayLabel).toBe('Requesting Precision...');
    expect(buildTrainingGenerationButtonDisplay(button({ id: 'express-medium', label: 'Generating express medium...' })).displayLabel).toBe('Generating Stabilize...');
  });

  it('describes the adaptive button as benchmark-driven', () => {
    const adaptive = buildTrainingGenerationButtonDisplay(button({ id: 'adaptive', label: 'Generate Session' }));

    expect(adaptive.displayTitle).toContain('benchmark');
    expect(adaptive.displayTitle).toContain('recovery, stabilization, progress, or challenge');
    expect(adaptive.displayHelpText).toContain('trainer reads your benchmark');
  });

  it('shows the approximate voice duration from the generation button preset', () => {
    const adaptive = buildTrainingGenerationButtonDisplay(button({ id: 'adaptive', label: 'Generate Session', durationMinutes: 2 }));
    const custom = buildTrainingGenerationButtonDisplay(button({ id: 'topic', label: 'Generate Topic Session', durationMinutes: 3 }));

    expect(adaptive.displayDurationLabel).toBe('Approx. 2 min audio');
    expect(adaptive.displayHelpText).toContain('About 2 minutes');
    expect(custom.displayDurationLabel).toBe('Approx. 3 min audio');
    expect(custom.displayHelpText).toContain('About 3 minutes');
  });

  it('updates Precision descriptions for recall and completion-window work', () => {
    const standard = buildTrainingGenerationButtonDisplay(button({ id: 'easy', label: 'New Easy Session' }));
    const legacyExpress = buildTrainingGenerationButtonDisplay(button({ id: 'express-easy', label: 'Express Easy Session' }));

    expect(standard.displayTitle).toContain('short, clear listening phrases');
    expect(standard.displayTitle).toContain('on-time completion');
    expect(standard.displayHelpText).toContain('detail recall');
    expect(legacyExpress.displayHelpText).toContain('About 2 minutes');
    expect(legacyExpress.displayHelpText).not.toContain('Compact');
  });

  it('updates Stabilize descriptions for flow and word-order work', () => {
    const standard = buildTrainingGenerationButtonDisplay(button({ id: 'medium', label: 'New Medium Session' }));
    const legacyExpress = buildTrainingGenerationButtonDisplay(button({ id: 'express-medium', label: 'Express Medium Session' }));

    expect(standard.displayTitle).toContain('balanced semantic phrases');
    expect(standard.displayTitle).toContain('word order');
    expect(standard.displayHelpText).toContain('word-order practice');
    expect(legacyExpress.displayHelpText).toContain('About 2 minutes');
    expect(legacyExpress.displayHelpText).not.toContain('Compact');
  });

  it('updates Challenge descriptions with precision and timing guardrails', () => {
    const standard = buildTrainingGenerationButtonDisplay(button({ id: 'hard', label: 'New Hard Session' }));
    const legacyExpress = buildTrainingGenerationButtonDisplay(button({ id: 'express-hard', label: 'Express Hard Session' }));

    expect(standard.displayTitle).toContain('denser language');
    expect(standard.displayTitle).toContain('completion timing are stable');
    expect(standard.displayHelpText).toContain('richer vocabulary and grammar');
    expect(legacyExpress.displayHelpText).toContain('About 2 minutes');
    expect(legacyExpress.displayHelpText).not.toContain('Compact');
  });

});
