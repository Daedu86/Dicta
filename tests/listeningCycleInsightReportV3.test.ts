import { describe, expect, it } from 'vitest';
import { buildListenerStateV3 } from '../src/core/adaptive/listenerStateV3';
import { buildListeningCycleInsightReportV3 } from '../src/core/adaptive/listeningCycleInsightReportV3';
import { resolveLanguageAdaptiveCalibration } from '../src/core/adaptive/languageAdaptiveCalibration';

function stableListenerState() {
  return buildListenerStateV3({
    lagSec: 0.4,
    accuracy: 0.97,
    chunkAccuracy: 0.96,
    rollingAccuracyLast3: 0.95,
    wpm: 42,
    phraseBoundaryType: 'sentence',
    semanticCompleteness: 0.98,
    syntaxComplexity: 0.18,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 900,
    voiceCalibrationStatus: 'calibrated',
  });
}

describe('buildListeningCycleInsightReportV3', () => {
  it('explains segmentation pressure from weak boundaries and preroll replay', () => {
    const listenerStateV3 = buildListenerStateV3({
      lagSec: 3.4,
      accuracy: 0.9,
      chunkAccuracy: 0.88,
      rollingAccuracyLast3: 0.86,
      wpm: 31,
      phraseBoundaryType: 'unsafe',
      semanticCompleteness: 0.36,
      syntaxComplexity: 0.78,
      currentPlaybackRate: 1,
      currentPauseAfterPhraseMs: 520,
    });

    const report = buildListeningCycleInsightReportV3([
      {
        listenerStateV3,
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.36,
        syntaxComplexity: 0.78,
        wpm: 31,
        accuracy: 0.9,
        currentPauseAfterPhraseMs: 520,
        v3Prosody: {
          boundaryStrength: 'weak',
          pauseClass: 'boundary',
          replayStrategy: 'repeat-with-preroll',
          reasonCodes: ['boundary-fragile'],
        },
        surgicalReplayPlan: {
          strategy: 'repeat-with-preroll',
          reasonCodes: ['replay-with-preroll'],
        },
      },
      {
        listenerStateV3,
        phraseBoundaryType: 'minor',
        semanticCompleteness: 0.58,
        wpm: 30,
        accuracy: 0.91,
        currentPauseAfterPhraseMs: 520,
        v3Prosody: {
          boundaryStrength: 'weak',
          pauseClass: 'boundary',
          replayStrategy: 'repeat-with-preroll',
        },
        surgicalReplayPlan: { strategy: 'repeat-with-preroll' },
      },
    ]);

    expect(report.primaryConstraint).toBe('listeningSegmentation');
    expect(report.reasonCodes).toContain('boundary-fragile');
    expect(report.reasonCodes).toContain('replay-with-preroll');
    expect(report.evidence.fragileBoundaryFrames).toBe(2);
    expect(report.evidence.replayWithPrerollFrames).toBe(2);
    expect(report.nextSessionKnobs.shorterChunks).toBe(true);
    expect(report.nextSessionKnobs.strongerBoundaries).toBe(true);
    expect(report.nextSessionKnobs.lowerRate).toBe(false);
    expect(report.headline).toContain('segmentar');
  });

  it('keeps typing mechanics separate when low WPM still has high accuracy', () => {
    const listenerStateV3 = buildListenerStateV3({
      lagSec: 2.5,
      accuracy: 0.96,
      chunkAccuracy: 0.95,
      rollingAccuracyLast3: 0.94,
      wpm: 18,
      phraseBoundaryType: 'sentence',
      semanticCompleteness: 0.97,
      syntaxComplexity: 0.18,
      currentPlaybackRate: 1,
      currentPauseAfterPhraseMs: 900,
    });

    const report = buildListeningCycleInsightReportV3([
      {
        listenerStateV3,
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.97,
        wpm: 18,
        accuracy: 0.96,
        chunkAccuracy: 0.95,
        currentPauseAfterPhraseMs: 900,
        v3Prosody: { boundaryStrength: 'strong', pauseClass: 'sentence', replayStrategy: 'none' },
      },
    ]);

    expect(report.primaryConstraint).toBe('typingMechanics');
    expect(report.reasonCodes).toContain('typing-lag-with-accuracy');
    expect(report.evidence.lowWpmHighAccuracyFrames).toBe(1);
    expect(report.nextSessionKnobs.typingPracticeSeparately).toBe(true);
    expect(report.nextSessionKnobs.preserveRate).toBe(true);
    expect(report.nextSessionKnobs.lowerRate).toBe(false);
    expect(report.headline).toContain('mecánica de tipeo');
  });

  it('identifies Browser TTS environment pressure from capped voices and short pauses', () => {
    const listenerStateV3 = buildListenerStateV3({
      lagSec: 1.1,
      accuracy: 0.92,
      chunkAccuracy: 0.93,
      rollingAccuracyLast3: 0.91,
      wpm: 38,
      phraseBoundaryType: 'sentence',
      semanticCompleteness: 0.95,
      syntaxComplexity: 0.2,
      currentPlaybackRate: 1.35,
      currentPauseAfterPhraseMs: 180,
      voiceCalibrationStatus: 'rate-capped',
      voiceRateLimited: true,
    });

    const report = buildListeningCycleInsightReportV3([
      {
        listenerStateV3,
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.95,
        wpm: 38,
        accuracy: 0.92,
        currentPlaybackRate: 1.35,
        currentPauseAfterPhraseMs: 180,
        actualPauseMs: 180,
        voiceCalibrationStatus: 'rate-capped',
        voiceRateLimited: true,
        v3Prosody: { boundaryStrength: 'strong', pauseClass: 'micro', replayStrategy: 'none' },
      },
    ]);

    expect(report.primaryConstraint).toBe('ttsEnvironment');
    expect(report.reasonCodes).toContain('voice-rate-limited');
    expect(report.reasonCodes).toContain('pause-too-short');
    expect(report.evidence.voiceRateLimitedFrames).toBe(1);
    expect(report.evidence.shortPauseFrames).toBe(1);
    expect(report.nextSessionKnobs.lowerRate).toBe(true);
    expect(report.nextSessionKnobs.longerPauses).toBe(true);
    expect(report.nextSessionKnobs.preserveRate).toBe(false);
  });

  it('preserves the current rhythm for stable sessions', () => {
    const report = buildListeningCycleInsightReportV3([
      {
        listenerStateV3: stableListenerState(),
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.98,
        wpm: 42,
        accuracy: 0.97,
        currentPlaybackRate: 1,
        currentPauseAfterPhraseMs: 900,
        v3Prosody: { boundaryStrength: 'strong', pauseClass: 'sentence', replayStrategy: 'none' },
      },
    ]);

    expect(report.primaryConstraint).toBe('none');
    expect(report.reasonCodes).toContain('low-pressure');
    expect(report.nextSessionKnobs.preserveRate).toBe(true);
    expect(report.nextSessionKnobs.shorterChunks).toBe(false);
    expect(report.nextSessionKnobs.lowerRate).toBe(false);
    expect(report.summaryBullets).toContain('Próxima sesión: preservar el rate actual.');
  });

  it('reports continuous adaptive fields and requested vs actual playback execution', () => {
    const languageCalibration = resolveLanguageAdaptiveCalibration('es');
    const pressureVector = {
      accuracy: 0,
      lag: 0,
      correction: 0.05,
      boundary: 0.1,
      semanticLoad: 0.12,
      reconstruction: 0.08,
      typing: 0.04,
      environment: 0.18,
      history: 0.02,
      currentSession: 0.08,
      perceptualPause: 0.72,
      traceQuality: 0.08,
    };
    const pacingOutput = {
      playbackRateTarget: 1.04,
      pauseMsTarget: 2400,
      phraseSizeTarget: 'medium' as const,
      boundaryStrictness: 0.48,
      replaySupport: 0.12,
      perceptualPauseLevel: 0.72,
      perceptualRateLevel: 0.08,
      targetWpmRange: languageCalibration.comfortableWpmRange,
    };
    const sampleQuality = {
      acceptedForBenchmark: true,
      acceptedForSessionInsight: true,
      acceptedForTelemetryLearning: true,
      acceptedForRuntimePressure: true,
      confidenceWeight: 0.9,
      lagReliability: 'raw' as const,
    };

    const report = buildListeningCycleInsightReportV3([
      {
        listenerStateV3: stableListenerState(),
        phraseBoundaryType: 'sentence',
        semanticCompleteness: 0.98,
        wpm: 48,
        accuracy: 0.98,
        requestedPlaybackRate: 1.04,
        actualPlaybackRate: 1.02,
        requestedPauseMs: 2400,
        actualPauseMs: 650,
        adaptiveLevel: 0.82,
        adaptiveDirection: 'holding',
        pressureVector,
        pacingOutput,
        sampleQuality,
        languageCalibration,
        derivedAdaptiveLabel: 'legacy-balanced',
        perceptualPauseLevel: 0.72,
        perceptualPauseShortfallMs: 1750,
        reasonCodes: ['continuous-adaptive-level', 'perceptual-pause-pressure'],
      },
    ]);

    expect(report.continuousAdaptive.latestAdaptiveLevel).toBe(0.82);
    expect(report.continuousAdaptive.latestDerivedLabel).toBe('legacy-balanced');
    expect(report.continuousAdaptive.latestPressureVector).toEqual(pressureVector);
    expect(report.continuousAdaptive.latestPacingOutput).toEqual(pacingOutput);
    expect(report.continuousAdaptive.latestSampleQuality).toEqual(sampleQuality);
    expect(report.continuousAdaptive.latestLanguageCalibration).toEqual(languageCalibration);
    expect(report.continuousAdaptive.requestedVsActual).toEqual({
      requestedPlaybackRate: 1.04,
      actualPlaybackRate: 1.02,
      requestedPauseMs: 2400,
      actualPauseMs: 650,
    });
    expect(report.reasonCodes).toContain('perceptual-pause-pressure');
    expect(report.nextSessionKnobs.longerPauses).toBe(true);
  });

  it('returns a low-confidence empty report when no frames are available', () => {
    const report = buildListeningCycleInsightReportV3([]);

    expect(report.primaryConstraint).toBe('none');
    expect(report.confidence).toBe(0);
    expect(report.evidence.totalFrames).toBe(0);
    expect(report.reasonCodes).toContain('low-pressure');
    expect(report.headline).toContain('No hay suficiente telemetría');
  });
});
