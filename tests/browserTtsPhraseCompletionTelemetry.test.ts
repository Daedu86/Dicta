import { describe, expect, it } from 'vitest';
import {
  buildBrowserTtsPhraseCompletionTelemetry,
} from '../src/app/browserTtsPhraseCompletionTelemetry';
import type { TtsLiveSignal } from '../src/app/ttsPlaybackProfile';
import type { LiveTelemetryFrame } from '../src/core/adaptive/types';

function chunkTelemetry(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'tts-3-chunk',
    spokenProgressRatio: 0.45,
    typedProgressRatio: 0.4,
    lagSec: 0.5,
    lagWords: 1,
    lagChars: 5,
    rawLagSec: 0.5,
    stableLagSec: 0.5,
    lagOutlierCount: 0,
    unsafeChunkCount: 1,
    accuracy: 0.92,
    chunkAccuracy: 0.88,
    rollingAccuracyLast3: 0.9,
    rollingAccuracyLast5: 0.91,
    sessionAccuracy: 0.92,
    errorRate: 0.08,
    wpm: 55,
    charsPerMinute: 0,
    pauseMs: 260,
    longestPauseMs: 0,
    backspaceRate: 0,
    correctionRate: 0,
    phraseDifficulty: 0.4,
    phraseLengthWords: 5,
    phraseLengthChars: 31,
    language: 'de',
    phraseBoundaryType: 'sentence',
    canPauseAfter: true,
    canReplayIndependently: false,
    semanticCompleteness: 1,
    punctuationLoad: 0.1,
    rareWordLoad: 0,
    syntaxComplexity: 0.2,
    currentPlaybackRate: 0.9,
    currentPauseAfterPhraseMs: 260,
    trend: 'stable',
    ...overrides,
  };
}

function liveSignal(overrides: Partial<TtsLiveSignal> = {}): TtsLiveSignal {
  return {
    accuracy: 84,
    lagSec: 1.25,
    rawLagSec: 1.4,
    stableLagSec: 1.1,
    lagOutlierCount: 2,
    wpm: 43,
    trend: 'declining',
    controllerState: 'hold',
    ...overrides,
  };
}

describe('buildBrowserTtsPhraseCompletionTelemetry', () => {
  it('builds completion telemetry from the latest live signal while preserving chunk context', () => {
    const baseTelemetry = chunkTelemetry();

    const completionTelemetry = buildBrowserTtsPhraseCompletionTelemetry({
      chunkTelemetry: baseTelemetry,
      semanticPhraseId: 'semantic-phrase-7',
      macroPhraseIndex: 7,
      liveSignal: liveSignal(),
      unsafeChunkCount: 3,
    });

    expect(completionTelemetry).toMatchObject({
      phraseId: 'semantic-phrase-7',
      accuracy: 0.84,
      wpm: 43,
      lagSec: 1.25,
      rawLagSec: 1.4,
      stableLagSec: 1.1,
      lagOutlierCount: 2,
      unsafeChunkCount: 3,
      trend: 'declining',
    });
    expect(completionTelemetry.errorRate).toBeCloseTo(0.16);
    expect(completionTelemetry.inputMode).toBe(baseTelemetry.inputMode);
    expect(completionTelemetry.phraseBoundaryType).toBe(baseTelemetry.phraseBoundaryType);
    expect(completionTelemetry.currentPlaybackRate).toBe(baseTelemetry.currentPlaybackRate);
    expect(completionTelemetry.rollingAccuracyLast3).toBe(baseTelemetry.rollingAccuracyLast3);
  });

  it('falls back to the macro phrase id and clamps percent accuracy', () => {
    const completionTelemetry = buildBrowserTtsPhraseCompletionTelemetry({
      chunkTelemetry: chunkTelemetry(),
      macroPhraseIndex: 4,
      liveSignal: liveSignal({ accuracy: 125 }),
      unsafeChunkCount: 0,
    });

    expect(completionTelemetry.phraseId).toBe('phrase-4');
    expect(completionTelemetry.accuracy).toBe(1);
    expect(completionTelemetry.errorRate).toBe(0);
  });
});
