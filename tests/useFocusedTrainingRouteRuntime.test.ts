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

  it('keeps adaptive and topic generation job limits independent', async () => {
    const { runtime } = await renderFocusedTrainingRouteRuntime({
      activeOpenRouterJobs: [
        createActiveTrainingJob('adaptive-1', 'Adaptive direct session'),
        createActiveTrainingJob('adaptive-2', 'Adaptive direct session'),
        createActiveTrainingJob('adaptive-3', 'Adaptive direct session'),
        createActiveTrainingJob('topic-1', 'Topic direct session'),
      ],
    });

    const adaptiveButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'adaptive');
    const topicButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'topic');

    expect(adaptiveButton?.disabled).toBe(true);
    expect(adaptiveButton?.label).toBe('Generating sessions (3/3)');
    expect(topicButton?.disabled).toBe(false);
    expect(topicButton?.label).toBe('Generate Topic Session (1/3)');
  });
});

function createActiveTrainingJob(jobId: string, slotLabel: string) {
  return {
    jobId,
    model: 'test-model',
    slotLabel,
    inputMode: 'browser-tts' as const,
    language: 'de' as const,
    durationMinutes: 2 as const,
    startedAt: '2026-06-20T12:00:00.000Z',
  };
}
