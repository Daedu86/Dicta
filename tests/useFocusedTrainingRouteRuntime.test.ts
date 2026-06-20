/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupFocusedTrainingRouteRuntimeHarness,
  renderFocusedTrainingRouteRuntime,
} from './helpers/focusedTrainingRouteRuntimeHarnessUtils';

afterEach(async () => {
  await cleanupFocusedTrainingRouteRuntimeHarness();
});

describe('useFocusedTrainingRouteRuntime', () => {
  it('returns focusedTrainingProps for the TrainingView route', async () => {
    const { runtime } = await renderFocusedTrainingRouteRuntime();

    expect(runtime.focusedTrainingProps.activeSession?.id).toBe('session-1');
    expect(runtime.focusedTrainingProps.currentTextValue).toBe('typed text');
    expect(runtime.focusedTrainingProps.liveScoreLabel).toBe('91');
    expect(runtime.focusedTrainingProps.liveAccuracyLabel).toBe('97.5%');
    expect(runtime.focusedTrainingProps.progressLabel).toBe('Word 2/4');
  });

  it('connects the adaptive and topic generation buttons', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    expect(runtime.focusedTrainingProps.generationButtons.map((button) => button.id)).toEqual(['adaptive', 'topic']);

    const adaptiveButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'adaptive');
    const topicButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'topic');

    act(() => {
      adaptiveButton?.onClick();
      topicButton?.onClick();
    });

    expect(args.generateAdaptiveNextSessionFromOpenRouter).toHaveBeenCalledTimes(1);
    expect(args.generateTopicNextSessionFromOpenRouter).toHaveBeenCalledTimes(1);
  });
});
