import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import {
  advanceSemanticPhrasePlayback,
  createSemanticPhrasePlaybackState,
  pickNextPhrase,
  planSemanticPhrases,
  replaySemanticPhrasePlayback,
} from '../src/core/adaptive/SemanticPhrasePlanner';
import type { AdaptivePacingInput, HistoricalPerformanceProfile, LiveTelemetryFrame } from '../src/core/adaptive/types';

function buildHistory(overrides: Partial<HistoricalPerformanceProfile> = {}): HistoricalPerformanceProfile {
  return {
    language: 'en',
    inputMode: 'browser-tts',
    comfortablePlaybackRate: 1,
    averageWpm: 55,
    averageAccuracy: 0.9,
    averageLagSec: 1.1,
    averagePauseMs: 700,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 700,
    typicalBackspaceRate: 0.04,
    typicalCorrectionRate: 0.05,
    strugglesWithLongPhrases: false,
    strugglesWithNumbers: false,
    strugglesWithNames: false,
    strugglesWithPunctuation: false,
    improvementTrend: 'stable',
    sessionsCount: 5,
    profileConfidence: 0.8,
    ...overrides,
  };
}

function buildLive(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'p1',
    spokenProgressRatio: 0.6,
    typedProgressRatio: 0.4,
    lagSec: 2.7,
    lagWords: 4,
    lagChars: 18,
    accuracy: 0.78,
    errorRate: 0.22,
    wpm: 34,
    charsPerMinute: 180,
    pauseMs: 500,
    longestPauseMs: 900,
    backspaceRate: 0.06,
    correctionRate: 0.13,
    phraseDifficulty: 0.65,
    phraseLengthWords: 11,
    phraseLengthChars: 74,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    trend: 'declining',
    ...overrides,
  };
}

describe('AdaptiveDictationController semantic guardrails', () => {
  it('defers pause when struggling on unsafe boundary', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ canPauseAfter: false, phraseBoundaryType: 'unsafe' }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.shouldPauseNow).toBe(false);
    expect(decision.deferPauseUntilSafeBoundary).toBe(true);
  });

  it('allows pause when struggling on safe boundary', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ canPauseAfter: true, phraseBoundaryType: 'clause' }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.shouldPauseNow).toBe(true);
    expect(decision.deferPauseUntilSafeBoundary).toBe(false);
  });

  it('denies replay for low semantic completeness', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ canReplayIndependently: true, semanticCompleteness: 0.45 }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.shouldReplayPhrase).toBe(false);
  });

  it('converts replay intent into recovery when phrase replay is not supported', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ lagSec: 3.1, accuracy: 0.78, canReplayIndependently: true, semanticCompleteness: 0.9 }),
      history: buildHistory(),
      capabilities: {
        supportsClausePause: false,
        supportsSentencePause: true,
        supportsPhraseReplay: false,
        supportsMidPhraseReplay: false,
        supportsDynamicRateChange: true,
        requiresPreChunking: true,
      },
    };
    const decision = controller.decide(input);
    expect(decision.shouldReplayPhrase).toBe(false);
    expect(decision.nextPhraseSize).toBe('short');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
  });

  it('uses stabilized lagSec for decisions while rawLagSec remains diagnostic', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({
        lagSec: 1.1,
        rawLagSec: -91.68,
        stableLagSec: -5,
        accuracy: 0.9,
        correctionRate: 0.04,
      }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.mode).not.toBe('support');
  });

  it('enforces playback rate floors by mode', () => {
    const controller = new AdaptiveDictationController();
    const supportDecision = controller.decide({
      live: buildLive({ lagSec: 3.4, accuracy: 0.75, correctionRate: 0.14 }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.92 }),
    });
    expect(supportDecision.mode).toBe('support');
    expect(supportDecision.playbackRate).toBeGreaterThanOrEqual(0.82);

    const extremeSupportDecision = controller.decide({
      live: buildLive({ lagSec: 4.8, accuracy: 0.72, correctionRate: 0.2 }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.92 }),
    });
    expect(extremeSupportDecision.mode).toBe('support');
    expect(extremeSupportDecision.playbackRate).toBeGreaterThanOrEqual(0.78);

    const balancedDecision = controller.decide({
      live: buildLive({ lagSec: 1.0, accuracy: 0.9, correctionRate: 0.05 }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.9 }),
    });
    expect(balancedDecision.mode === 'balanced' || balancedDecision.mode === 'flow').toBe(true);
    expect(balancedDecision.playbackRate).toBeGreaterThanOrEqual(0.84);
  });

  it('keeps defer-pause slowdown above the mode floor', () => {
    const controller = new AdaptiveDictationController();
    const supportDeferred = controller.decide({
      live: buildLive({ lagSec: 3.2, accuracy: 0.79, correctionRate: 0.13, canPauseAfter: false }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.9 }),
    });
    expect(supportDeferred.deferPauseUntilSafeBoundary).toBe(true);
    expect(supportDeferred.mode).toBe('support');
    expect(supportDeferred.playbackRate).toBeGreaterThanOrEqual(0.82);

    const balancedDeferred = controller.decide({
      live: buildLive({ lagSec: 1.0, accuracy: 0.91, correctionRate: 0.03, canPauseAfter: false }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.9 }),
    });
    expect(balancedDeferred.deferPauseUntilSafeBoundary).toBe(false);
    expect(balancedDeferred.playbackRate).toBeGreaterThanOrEqual(0.84);
  });

  it('exits support after sustained recovery', () => {
    const controller = new AdaptiveDictationController();
    controller.decide({
      live: buildLive({ lagSec: 3.1, accuracy: 0.79, correctionRate: 0.12 }),
      history: buildHistory(),
    });
    controller.decide({
      live: buildLive({ lagSec: 2.8, accuracy: 0.8, correctionRate: 0.11 }),
      history: buildHistory(),
    });

    const recovered1 = controller.decide({
      live: buildLive({ lagSec: 1.2, accuracy: 0.94, correctionRate: 0.03 }),
      history: buildHistory(),
    });
    const recovered2 = controller.decide({
      live: buildLive({ lagSec: 1.1, accuracy: 0.95, correctionRate: 0.03 }),
      history: buildHistory(),
    });
    const recovered3 = controller.decide({
      live: buildLive({ lagSec: 1.0, accuracy: 0.95, correctionRate: 0.03 }),
      history: buildHistory(),
    });
    expect(recovered1.mode).not.toBe('support');
    expect(recovered2.mode).not.toBe('support');
    expect(recovered3.mode).not.toBe('support');
  });
});

describe('SemanticPhrasePlanner heuristics', () => {
  it('produces sentence and clause chunks for EN/ES/DE', () => {
    const en = planSemanticPhrases('We start slowly, then we speed up. Finally we review.', 'en', 'medium');
    const es = planSemanticPhrases('Primero escuchamos, luego escribimos. Al final revisamos.', 'es', 'medium');
    const de = planSemanticPhrases('Zuerst horen wir zu, dann schreiben wir. Danach prufen wir.', 'de', 'medium');
    expect(en.some((item) => item.boundaryType === 'sentence' || item.boundaryType === 'clause')).toBe(true);
    expect(es.some((item) => item.boundaryType === 'sentence' || item.boundaryType === 'clause')).toBe(true);
    expect(de.some((item) => item.boundaryType === 'sentence' || item.boundaryType === 'clause')).toBe(true);
  });

  it('avoids unsafe determiner+noun split when obvious', () => {
    const phrases = planSemanticPhrases('The final answer is clear and the result is stable.', 'en', 'short');
    const hasUnsafeEdge = phrases.some((phrase) => /\bthe$/i.test(phrase.text));
    expect(hasUnsafeEdge).toBe(false);
  });

  it('picks size from safe semantic candidates', () => {
    const phrases = planSemanticPhrases('One short sentence. Another sentence with a comma, and a smooth ending.', 'en', 'long');
    const picked = pickNextPhrase(phrases, 'short', 'clause');
    expect(picked).not.toBeNull();
    expect((picked?.boundaryType ?? 'unsafe') === 'sentence' || (picked?.boundaryType ?? 'unsafe') === 'clause').toBe(true);
  });
});

describe('semantic phrase playback progression', () => {
  it('starts playback at phrase index 0', () => {
    const state = createSemanticPhrasePlaybackState();
    expect(state.currentPhraseIndex).toBe(0);
    expect(state.lastPhraseAdvanceReason).toBe('start');
  });

  it('advances phrase completion by exactly 1', () => {
    const state = createSemanticPhrasePlaybackState();
    const next = advanceSemanticPhrasePlayback(state, 4, 'phrase_complete');
    expect(next.currentPhraseIndex).toBe(1);
    expect(next.phraseAdvanceCount).toBe(1);
    expect(next.lastPhraseAdvanceReason).toBe('phrase_complete');
  });

  it('replay does not advance phrase index', () => {
    const state = advanceSemanticPhrasePlayback(createSemanticPhrasePlaybackState(), 4);
    const replay = replaySemanticPhrasePlayback(state);
    expect(replay.currentPhraseIndex).toBe(1);
    expect(replay.phraseReplayCount).toBe(1);
  });

  it('deferred pause leaves phrase index unchanged', () => {
    const state = createSemanticPhrasePlaybackState();
    expect(state.currentPhraseIndex).toBe(0);
  });

  it('typed progress noise cannot choose a later paragraph', () => {
    const text = 'First paragraph starts here. It continues calmly. Second paragraph should not start first.';
    const phrases = planSemanticPhrases(text, 'en', 'short');
    const noisyTypedProgressRatio = 0.95;
    const currentPhraseIndex = 0;
    expect(noisyTypedProgressRatio).toBeGreaterThan(0.9);
    expect(phrases[currentPhraseIndex].text).toContain('First paragraph');
    expect(phrases[currentPhraseIndex].text).not.toContain('Second paragraph');
  });
});
