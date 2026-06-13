import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import type { AdaptivePacingInput } from '../src/core/adaptive/types';

function input(overrides: Partial<AdaptivePacingInput> = {}): AdaptivePacingInput {
  return {
    live: {
      inputMode: 'browser-tts',
      language: 'en',
      accuracy: 0.74,
      rollingAccuracyLast3: 0.74,
      rollingAccuracyLast5: 0.74,
      lagSec: 3.2,
      rawLagSec: 3.2,
      stableLagSec: 3.2,
      wpm: 28,
      charsPerMinute: 140,
      pauseMs: 750,
      correctionRate: 0,
      backspaceRate: 0,
      phraseDifficulty: 0.5,
      phraseLengthWords: 8,
      boundaryType: 'sentence',
      semanticCompleteness: 1,
      punctuationLoad: 0,
      rareWordLoad: 0,
      syntaxComplexity: 0.5,
      playbackRate: 0.9,
      spokenProgress: 0.5,
      typedProgress: 0.35,
      spokenWordIndex: 8,
      typedWordIndex: 5,
      targetWordCount: 16,
      sessionChunkIndex: 4,
      ...(overrides.live ?? {}),
    },
    history: {
      averageAccuracy: 0.78,
      averageLagSec: 2.4,
      averageWpm: 32,
      comfortablePlaybackRate: 0.9,
      sessionsCount: 1,
      profileConfidence: 0.3,
      ...(overrides.history ?? {}),
    },
    capabilities: {
      canPause: true,
      canReplayPhrase: false,
      canAdjustRate: true,
      canChunkBySemanticBoundary: true,
      minRate: 0.6,
      maxRate: 1.2,
      preferredRateStep: 0.05,
      supportsPhraseReplay: false,
      supportsLiveProgress: true,
      ...(overrides.capabilities ?? {}),
    },
  };
}

describe('AdaptiveDictationController reasonCodes', () => {
  it('emits structured reason codes alongside the legacy reason string', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(input());

    expect(decision.reason).toContain('support-needed');
    expect(decision.reasonCodes).toContain('mode-support');
    expect(decision.reasonCodes).toContain('support-needed');
    expect(decision.reasonCodes).toContain('low-history-confidence');
  });

  it('emits structured reason codes for Browser TTS warmup', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(input({
      live: {
        inputMode: 'browser-tts',
        language: 'en',
        sessionChunkIndex: 0,
        accuracy: 0.95,
        rollingAccuracyLast3: 0.95,
        rollingAccuracyLast5: 0.95,
        lagSec: 0.2,
        rawLagSec: 0.2,
        stableLagSec: 0.2,
      },
      history: {
        sessionsCount: 6,
        profileConfidence: 0.9,
        averageAccuracy: 0.92,
        averageLagSec: 0.4,
        averageWpm: 48,
        comfortablePlaybackRate: 0.95,
      },
    }));

    expect(decision.reason).toContain('session-warmup-calibration');
    expect(decision.reasonCodes).toEqual([
      'mode-support',
      'session-warmup-calibration',
      'support-needed',
    ]);
  });
});
