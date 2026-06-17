import { describe, expect, it } from 'vitest';
import { buildListenerStateV3 } from '../src/core/adaptive/listenerStateV3';

describe('buildListenerStateV3', () => {
  it('identifies listening segmentation pressure from fragile boundaries and incomplete chunks', () => {
    const state = buildListenerStateV3({
      lagSec: 3.2,
      accuracy: 0.9,
      chunkAccuracy: 0.88,
      wpm: 24,
      phraseBoundaryType: 'unsafe',
      semanticCompleteness: 0.38,
      syntaxComplexity: 0.78,
      currentPlaybackRate: 1,
      currentPauseAfterPhraseMs: 520,
    });

    expect(state.primaryConstraint).toBe('listeningSegmentation');
    expect(state.axes.listeningSegmentation.level).toBe('strained');
    expect(state.reasonCodes).toContain('boundary-fragile');
    expect(state.reasonCodes).toContain('semantic-incomplete');
    expect(state.nextSessionKnobs.strongerBoundaries).toBe(true);
    expect(state.nextSessionKnobs.shorterChunks).toBe(true);
    expect(state.nextSessionKnobs.lowerRate).toBe(false);
  });

  it('keeps low WPM separate from listening failure when accuracy is high', () => {
    const state = buildListenerStateV3({
      lagSec: 2.4,
      accuracy: 0.95,
      chunkAccuracy: 0.96,
      rollingAccuracyLast3: 0.94,
      wpm: 18,
      backspaceRate: 0.05,
      correctionRate: 0.04,
      phraseBoundaryType: 'sentence',
      semanticCompleteness: 0.96,
      syntaxComplexity: 0.2,
      currentPlaybackRate: 1,
      currentPauseAfterPhraseMs: 900,
    });

    expect(state.primaryConstraint).toBe('typingMechanics');
    expect(state.axes.listeningSegmentation.level).toBe('clear');
    expect(state.reasonCodes).toContain('typing-lag-with-accuracy');
    expect(state.nextSessionKnobs.typingPracticeSeparately).toBe(true);
    expect(state.nextSessionKnobs.preserveRate).toBe(true);
    expect(state.nextSessionKnobs.lowerRate).toBe(false);
  });

  it('identifies reconstruction pressure from low accuracy on otherwise safe chunks', () => {
    const state = buildListenerStateV3({
      lagSec: 0.8,
      accuracy: 0.68,
      chunkAccuracy: 0.62,
      rollingAccuracyLast3: 0.58,
      wpm: 36,
      phraseBoundaryType: 'sentence',
      semanticCompleteness: 0.9,
      syntaxComplexity: 0.35,
      currentPlaybackRate: 0.95,
      currentPauseAfterPhraseMs: 900,
    });

    expect(state.primaryConstraint).toBe('reconstruction');
    expect(state.axes.reconstruction.level).toBe('strained');
    expect(state.reasonCodes).toContain('accuracy-pressure');
    expect(state.reasonCodes).toContain('rolling-accuracy-pressure');
    expect(state.nextSessionKnobs.shorterChunks).toBe(true);
    expect(state.nextSessionKnobs.strongerBoundaries).toBe(false);
  });

  it('identifies TTS environment pressure when a browser voice is rate limited', () => {
    const state = buildListenerStateV3({
      lagSec: 1,
      accuracy: 0.91,
      chunkAccuracy: 0.92,
      wpm: 34,
      phraseBoundaryType: 'sentence',
      semanticCompleteness: 0.94,
      syntaxComplexity: 0.25,
      currentPlaybackRate: 1.45,
      currentPauseAfterPhraseMs: 180,
      voiceCalibrationStatus: 'rate-capped',
      voiceRateLimited: true,
    });

    expect(state.primaryConstraint).toBe('ttsEnvironment');
    expect(state.axes.ttsEnvironment.level).toBe('strained');
    expect(state.reasonCodes).toContain('voice-rate-limited');
    expect(state.reasonCodes).toContain('rate-too-high');
    expect(state.reasonCodes).toContain('pause-too-short');
    expect(state.nextSessionKnobs.lowerRate).toBe(true);
    expect(state.nextSessionKnobs.longerPauses).toBe(true);
  });

  it('returns a low-pressure state for stable sessions', () => {
    const state = buildListenerStateV3({
      lagSec: 0.4,
      accuracy: 0.97,
      chunkAccuracy: 0.96,
      rollingAccuracyLast3: 0.95,
      wpm: 42,
      backspaceRate: 0.02,
      correctionRate: 0.03,
      phraseBoundaryType: 'sentence',
      semanticCompleteness: 0.98,
      syntaxComplexity: 0.18,
      currentPlaybackRate: 1,
      currentPauseAfterPhraseMs: 900,
      voiceCalibrationStatus: 'calibrated',
    });

    expect(state.primaryConstraint).toBe('none');
    expect(state.reasonCodes).toContain('low-pressure');
    expect(state.nextSessionKnobs.preserveRate).toBe(true);
    expect(state.nextSessionKnobs.shorterChunks).toBe(false);
  });
});
