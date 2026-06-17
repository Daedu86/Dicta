import { expect, it } from 'vitest';
import { createTtsPlaybackControlsHarness } from './ttsPlaybackControlsHarness';

export function defineTtsPlaybackControlsPauseResumeTests() {
  it('pauses by capturing the spoken word, cancelling TTS, clearing refs, and updating status', () => {
    const { calls, controls, refs, state } = createTtsPlaybackControlsHarness();

    controls.pauseTts();

    expect(calls.estimateTtsSpokenWordIndex).toHaveBeenCalledTimes(1);
    expect(refs.pausedAt.current).toBe(7);
    expect(calls.cancelBrowserTts).toHaveBeenCalledTimes(1);
    expect(refs.utterance.current).toBeNull();
    expect(refs.chunkStart.current).toBeNull();
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('pause');
    expect(state.running).toBe(false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.status).toBe('paused');
  });

  it('resumes from a paused word by replaying from that word without browser resume telemetry', () => {
    const { calls, controls, refs } = createTtsPlaybackControlsHarness();
    refs.pausedAt.current = 4;

    controls.resumeTts();

    expect(calls.playTtsFromWord).toHaveBeenCalledWith(4);
    expect(calls.resumeBrowserTts).not.toHaveBeenCalled();
    expect(calls.recordTtsTelemetryAction).not.toHaveBeenCalled();
  });

  it('resumes browser playback and initializes startedAt when no paused word exists', () => {
    const { calls, controls, refs, state } = createTtsPlaybackControlsHarness({
      ttsStatus: 'paused',
    });
    refs.startedAt.current = null;

    controls.resumeTts();

    expect(calls.resumeBrowserTts).toHaveBeenCalledTimes(1);
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('resume');
    expect(refs.startedAt.current).toBe(1234);
    expect(state.running).toBe(true);
    expect(state.sessionStatus).toBe('running');
    expect(state.status).toBe('playing');
  });
}
