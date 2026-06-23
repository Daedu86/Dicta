/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ActiveOpenRouterJob } from '../src/core/openRouterJobs';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
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
    expect(runtime.focusedTrainingProps.generationButtons.map((button) => button.durationMinutes)).toEqual([3, 3]);

    const adaptiveButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'adaptive');
    const topicButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'topic');

    act(() => {
      adaptiveButton?.onClick();
      topicButton?.onClick();
    });

    expect(args.generateAdaptiveNextSessionFromOpenRouter).toHaveBeenCalledTimes(1);
    expect(args.generateTopicNextSessionFromOpenRouter).toHaveBeenCalledTimes(1);
  });

  it('reflects the shared direct generation duration in focused training buttons', async () => {
    const { runtime } = await renderFocusedTrainingRouteRuntime({
      directGenerationDurationMinutes: 5,
    });

    expect(runtime.focusedTrainingProps.generationButtons.map((button) => button.durationMinutes)).toEqual([5, 5]);
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

function createActiveTrainingJob(jobId: string, slotLabel: string): ActiveOpenRouterJob {
  return {
    jobId,
    model: 'test-model',
    slotLabel,
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    language: 'de',
    durationMinutes: 2,
    startedAt: '2026-06-20T12:00:00.000Z',
  };
}
