/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupFocusedTrainingRouteRuntimeHarness,
  renderFocusedTrainingRouteRuntime,
} from './helpers/focusedTrainingRouteRuntimeHarness';

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

  it('connects focused training controls', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    act(() => {
      runtime.focusedTrainingProps.onPlay();
      runtime.focusedTrainingProps.onPause('edited text');
      runtime.focusedTrainingProps.onStop('stopped text');
      runtime.focusedTrainingProps.onSubmit('submitted text');
    });

    expect(args.playTts).toHaveBeenCalledTimes(1);
    expect(args.onTtsPracticeChange).toHaveBeenNthCalledWith(1, 'edited text');
    expect(args.pauseTts).toHaveBeenCalledTimes(1);
    expect(args.onTtsPracticeChange).toHaveBeenNthCalledWith(2, 'stopped text');
    expect(args.stopTtsPlayback).toHaveBeenCalledWith('stop');
    expect(args.submitTtsSession).toHaveBeenCalledWith('submitted text');
  });

  it('connects generation buttons', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    expect(runtime.focusedTrainingProps.generationButtons.map((button) => button.id)).toEqual([
      'easy',
      'medium',
      'hard',
    ]);

    const easyButton = runtime.focusedTrainingProps.generationButtons.find((button) => button.id === 'easy');

    act(() => {
      easyButton?.onClick();
    });

    expect(args.generateEasyNextSessionFromOpenRouter).toHaveBeenCalledTimes(1);
  });

  it('replays focused TTS from the current progress minus the rewind buffer', async () => {
    const { args, runtime } = await renderFocusedTrainingRouteRuntime();

    act(() => {
      runtime.focusedTrainingProps.onReplay();
    });

    expect(args.seekTtsPlayback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(args.seekTtsPlayback).mock.calls[0][0]).toBeCloseTo(0.42);
  });
});
