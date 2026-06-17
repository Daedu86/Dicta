import { describe, expect, it } from 'vitest';
import { defineTtsPlaybackControlsPauseResumeTests } from './helpers/ttsPlaybackControlsPauseResumeSuite';
import { createTtsPlaybackControlsHarness } from './helpers/ttsPlaybackControlsHarness';

describe('createTtsPlaybackControls', () => {
  defineTtsPlaybackControlsPauseResumeTests();

  it('stops playback, resets runtime refs, and derives paused/ready status from practice and source text', () => {
    const { calls, controls, refs, state } = createTtsPlaybackControlsHarness();

    controls.stopTtsPlayback('stop');

    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('stop');
    expect(calls.cancelBrowserTts).toHaveBeenCalledTimes(1);
    expect(refs.utterance.current).toBeNull();
    expect(refs.chunkStart.current).toBeNull();
    expect(refs.pausedAt.current).toBeNull();
    expect(refs.completed.current).toBe(0);
    expect(state.currentChunk).toBe('');
    expect(state.pacingMode).toBe('balanced');
    expect(state.speechRate).toBe(1);
    expect(state.running).toBe(false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.status).toBe('ready');
  });

  it('stops without action, keeps finished sessions finished, and idles when source text is empty', () => {
    const { calls, controls, state } = createTtsPlaybackControlsHarness({
      isBrowserTtsSupported: () => false,
      ttsPracticeText: '',
      ttsText: '   ',
    });
    state.sessionStatus = 'finished';

    controls.stopTtsPlayback();

    expect(calls.recordTtsTelemetryAction).not.toHaveBeenCalled();
    expect(calls.cancelBrowserTts).not.toHaveBeenCalled();
    expect(state.sessionStatus).toBe('finished');
    expect(state.status).toBe('idle');
  });

  it('seeks while idle by clamping target word and publishing ready paused progress', () => {
    const { calls, controls, refs, state } = createTtsPlaybackControlsHarness({
      ttsStatus: 'ready',
    });

    controls.seekTtsPlayback(0.5);

    expect(calls.cancelBrowserTts).toHaveBeenCalledTimes(1);
    expect(refs.pausedAt.current).toBeNull();
    expect(refs.completed.current).toBe(4);
    expect(refs.chunkStart.current).toBeNull();
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('seek');
    expect(calls.playTtsFromWord).not.toHaveBeenCalled();
    expect(state.status).toBe('ready');
    expect(state.running).toBe(false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.tick).toBe(1);
  });

  it('seeks while playing by replaying from the clamped target word', () => {
    const { calls, controls, refs } = createTtsPlaybackControlsHarness({
      ttsStatus: 'playing',
    });

    controls.seekTtsPlayback(2);

    expect(refs.completed.current).toBe(9);
    expect(calls.recordTtsTelemetryAction).toHaveBeenCalledWith('seek');
    expect(calls.playTtsFromWord).toHaveBeenCalledWith(9);
  });

  it('does not seek outside Browser TTS, without source text, after finish, or without transcript words', () => {
    const nonBrowser = createTtsPlaybackControlsHarness({ activeInputMode: 'keyboard' });
    nonBrowser.controls.seekTtsPlayback(0.5);
    expect(nonBrowser.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();

    const noText = createTtsPlaybackControlsHarness({ ttsHasText: false });
    noText.controls.seekTtsPlayback(0.5);
    expect(noText.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();

    const finished = createTtsPlaybackControlsHarness({ activeSessionFinished: true });
    finished.controls.seekTtsPlayback(0.5);
    expect(finished.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();

    const noWords = createTtsPlaybackControlsHarness({ ttsTranscriptWordCount: 0 });
    noWords.controls.seekTtsPlayback(0.5);
    expect(noWords.calls.recordTtsTelemetryAction).not.toHaveBeenCalled();
  });
});
