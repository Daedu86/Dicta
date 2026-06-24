import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../src/core/languages';
import { buildContinuousAdaptiveListeningSnapshot } from '../src/core/adaptive/continuousAdaptiveListening';
import { deriveAdaptiveLabel } from '../src/core/adaptive/continuousAdaptiveListeningBrain';
import { mapAdaptiveStateToPacingOutput } from '../src/core/adaptive/adaptivePacingOutputMapper';
import { buildAdaptivePressureVector } from '../src/core/adaptive/adaptivePressureVector';
import { normalizeRuntimeTelemetry } from '../src/core/adaptive/continuousTelemetryNormalizer';
import { evaluateRuntimeSampleQuality } from '../src/core/adaptive/runtimeSampleQualityGate';
import { resolveLanguageAdaptiveCalibration } from '../src/core/adaptive/languageAdaptiveCalibration';
import type {
  AdaptiveListeningState,
  AdaptivePressureVector,
  LanguageAdaptiveCalibration,
} from '../src/core/adaptive/continuousAdaptiveListeningTypes';
import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  LiveTelemetryFrame,
  PacingDecision,
} from '../src/core/adaptive/types';

function live(language: SupportedLanguage, overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: `${language}-phrase-1`,
    spokenProgressRatio: 0.55,
    typedProgressRatio: 0.53,
    lagSec: 0.35,
    lagWords: 1,
    lagChars: 4,
    rawLagSec: 0.35,
    stableLagSec: 0.35,
    lagFallbackUsed: false,
    lagOutlierCount: 0,
    accuracy: 0.96,
    chunkAccuracy: 0.96,
    rollingAccuracyLast3: 0.96,
    rollingAccuracyLast5: 0.96,
    errorRate: 0.04,
    wpm: 54,
    charsPerMinute: 260,
    pauseMs: 650,
    longestPauseMs: 720,
    backspaceRate: 0.02,
    correctionRate: 0.03,
    phraseDifficulty: 0.32,
    phraseLengthWords: 8,
    phraseLengthChars: 42,
    language,
    phraseBoundaryType: 'sentence',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 0.96,
    syntaxComplexity: 0.16,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 650,
    trend: 'stable',
    ...overrides,
  };
}

function history(language: SupportedLanguage, overrides: Partial<HistoricalPerformanceProfile> = {}): HistoricalPerformanceProfile {
  return {
    inputMode: 'browser-tts',
    language,
    comfortablePlaybackRate: 1,
    averageWpm: 52,
    averageAccuracy: 0.94,
    averageLagSec: 0.45,
    averagePauseMs: 800,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 800,
    typicalBackspaceRate: 0.02,
    typicalCorrectionRate: 0.03,
    strugglesWithLongPhrases: false,
    strugglesWithNumbers: false,
    strugglesWithNames: false,
    strugglesWithPunctuation: false,
    improvementTrend: 'stable',
    sessionsCount: 8,
    profileConfidence: 0.82,
    ...overrides,
  };
}

function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 1,
    pauseAfterPhraseMs: 650,
    shouldPauseNow: true,
    shouldReplayPhrase: false,
    boundaryStrictness: 'sentence',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.92,
    nextPhraseSize: 'medium',
    reason: 'test',
    reasonCodes: [],
    lagScore: 0.9,
    accuracyScore: 0.96,
    hesitationScore: 0.88,
    confidenceScore: 0.82,
    ...overrides,
  };
}

function input(language: SupportedLanguage, overrides: Partial<AdaptivePacingInput> = {}): AdaptivePacingInput {
  return {
    live: live(language),
    history: history(language),
    capabilities: {
      supportsClausePause: true,
      supportsSentencePause: true,
      supportsPhraseReplay: false,
      supportsMidPhraseReplay: false,
      supportsDynamicRateChange: true,
      requiresPreChunking: true,
    },
    ...overrides,
  };
}

function zeroPressure(overrides: Partial<AdaptivePressureVector> = {}): AdaptivePressureVector {
  return {
    accuracy: 0,
    lag: 0,
    correction: 0,
    boundary: 0,
    semanticLoad: 0,
    reconstruction: 0,
    typing: 0,
    environment: 0,
    history: 0,
    currentSession: 0,
    perceptualPause: 0,
    traceQuality: 0,
    ...overrides,
  };
}

describe('continuous adaptive listening brain', () => {
  it('documents the pre-reset snapshot and target normalization architecture', () => {
    const docPath = 'docs/adaptive-listening-v3-normalization-plan.md';
    expect(existsSync(docPath)).toBe(true);

    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toContain('adaptive-v3-pre-continuous-reset');
    expect(doc).toContain('support');
    expect(doc).toContain('recovery');
    expect(doc).toContain('balanced');
    expect(doc).toContain('flow');
    expect(doc).toContain('perceptualPause');
    expect(doc).toContain('Language Calibration Layer');
  });

  it('uses one sample quality gate contract across all Browser TTS languages', () => {
    const results = SUPPORTED_LANGUAGES.map((language) => {
      const calibration = resolveLanguageAdaptiveCalibration(language);
      const telemetry = normalizeRuntimeTelemetry({
        live: live(language, {
          phraseBoundaryType: 'unsafe',
          semanticCompleteness: 0.4,
        }),
        decision: decision(),
        event: 'phrase_completed',
        phraseIndex: 0,
        totalSemanticPhrases: 2,
        calibration,
      });
      return evaluateRuntimeSampleQuality(telemetry, calibration);
    });

    expect(results).toHaveLength(5);
    expect(new Set(results.map((result) => result.rejectionReason))).toEqual(new Set(['unsafe_phrase_boundary']));
    expect(results.every((result) => result.acceptedForBenchmark === false)).toBe(true);
    expect(results.every((result) => result.acceptedForRuntimePressure === true)).toBe(true);
    expect(results.every((result) => result.lagReliability === 'raw')).toBe(true);
  });

  it('raises ES perceptual pause pressure and pause target without forcing rate down', () => {
    const snapshot = buildContinuousAdaptiveListeningSnapshot({
      input: input('es', {
        live: live('es', {
          accuracy: 0.98,
          chunkAccuracy: 0.98,
          rollingAccuracyLast3: 0.97,
          lagSec: 0.28,
          rawLagSec: 0.28,
          stableLagSec: 0.28,
          wpm: 58,
          currentPlaybackRate: 1,
          currentPauseAfterPhraseMs: 650,
        }),
        history: history('es', {
          comfortablePlaybackRate: 1,
          averageAccuracy: 0.96,
          averageLagSec: 0.35,
        }),
      }),
      decision: decision({ playbackRate: 1, pauseAfterPhraseMs: 650 }),
      execution: {
        requestedPlaybackRate: 1,
        actualPlaybackRate: 1,
        requestedPauseMs: 650,
        actualPauseMs: 520,
      },
      event: 'phrase_completed',
      phraseIndex: 0,
      totalSemanticPhrases: 3,
    });

    expect(snapshot.sampleQuality.acceptedForBenchmark).toBe(true);
    expect(snapshot.pressure.accuracy).toBeLessThan(0.05);
    expect(snapshot.pressure.lag).toBe(0);
    expect(snapshot.pressure.perceptualPause).toBeGreaterThanOrEqual(0.25);
    expect(snapshot.output.pauseMsTarget).toBeGreaterThanOrEqual(1500);
    expect(snapshot.output.playbackRateTarget).toBeGreaterThanOrEqual(1);
  });

  it('lets DE fallback lag feed insight and runtime pressure through the same gate', () => {
    const calibration = resolveLanguageAdaptiveCalibration('de');
    const telemetry = normalizeRuntimeTelemetry({
      live: live('de', {
        rawLagSec: 12,
        stableLagSec: 0.42,
        lagSec: 0.42,
        lagFallbackUsed: true,
      }),
      decision: decision(),
      event: 'phrase_completed',
      phraseIndex: 1,
      totalSemanticPhrases: 4,
      calibration,
    });
    const sampleQuality = evaluateRuntimeSampleQuality(telemetry, calibration);

    expect(sampleQuality.lagReliability).toBe('fallback');
    expect(sampleQuality.acceptedForBenchmark).toBe(false);
    expect(sampleQuality.rejectionReason).toBe('rawLagSec_out_of_range');
    expect(sampleQuality.acceptedForSessionInsight).toBe(true);
    expect(sampleQuality.acceptedForRuntimePressure).toBe(true);
  });

  it('computes perceptual pause pressure from deferred pauses as a first-class axis', () => {
    const calibration = resolveLanguageAdaptiveCalibration('fr');
    const telemetry = normalizeRuntimeTelemetry({
      live: live('fr', {
        canPauseAfter: false,
        phraseBoundaryType: 'minor',
        currentPauseAfterPhraseMs: 400,
      }),
      decision: decision({ deferPauseUntilSafeBoundary: true, pauseAfterPhraseMs: 1800 }),
      event: 'defer_pause',
      phraseIndex: 0,
      totalSemanticPhrases: 5,
      calibration,
    });
    const sampleQuality = evaluateRuntimeSampleQuality(telemetry, calibration);
    const pressure = buildAdaptivePressureVector({
      telemetry,
      history: history('fr'),
      sampleQuality,
      calibration,
    });

    expect(telemetry.pauseDeferred).toBe(true);
    expect(telemetry.pauseShortfallMs).toBeGreaterThan(0);
    expect(pressure.perceptualPause).toBeGreaterThanOrEqual(0.42);
    expect(pressure.boundary).toBeGreaterThan(0);
  });

  it('keeps completed-gate actual pause telemetry from becoming shortfall pressure', () => {
    const calibration = resolveLanguageAdaptiveCalibration('es');
    const telemetry = normalizeRuntimeTelemetry({
      live: live('es', {
        currentPauseAfterPhraseMs: 1400,
      }),
      decision: decision({ pauseAfterPhraseMs: 1400 }),
      execution: {
        requestedPauseMs: 1400,
        actualPauseMs: 700,
        pauseGateResolutionReason: 'completed',
      },
      event: 'pause',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
      calibration,
    });

    expect(telemetry.actualPauseMs).toBe(700);
    expect(telemetry.pauseGateResolutionReason).toBe('completed');
    expect(telemetry.pauseShortfallMs).toBe(0);
    expect(telemetry.executionConfidence).toBeGreaterThanOrEqual(0.85);
  });

  it('maps pause and rate independently from adaptive pressure', () => {
    const calibration: LanguageAdaptiveCalibration = resolveLanguageAdaptiveCalibration('pt');
    const telemetry = normalizeRuntimeTelemetry({
      live: live('pt', { currentPlaybackRate: 1, currentPauseAfterPhraseMs: 500 }),
      decision: decision({ playbackRate: 1, pauseAfterPhraseMs: 500 }),
      event: 'phrase_completed',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
      calibration,
    });
    const state: AdaptiveListeningState = {
      adaptiveLevel: 0.82,
      confidence: 0.9,
      direction: 'holding',
      pressure: zeroPressure({ perceptualPause: 0.8 }),
      reasonCodes: ['continuous-adaptive-level', 'perceptual-pause-pressure'],
    };

    const output = mapAdaptiveStateToPacingOutput({
      state,
      telemetry,
      history: history('pt', { comfortablePlaybackRate: 1 }),
      calibration,
    });

    expect(output.pauseMsTarget).toBeGreaterThanOrEqual(1500);
    expect(output.playbackRateTarget).toBeGreaterThanOrEqual(1);
    expect(output.perceptualPauseLevel).toBe(0.8);
  });

  it('keeps derived legacy labels out of output mapping decisions', () => {
    const calibration = resolveLanguageAdaptiveCalibration('en');
    const telemetry = normalizeRuntimeTelemetry({
      live: live('en'),
      decision: decision(),
      event: 'phrase_completed',
      phraseIndex: 0,
      totalSemanticPhrases: 2,
      calibration,
    });
    const state: AdaptiveListeningState = {
      adaptiveLevel: 0.5,
      confidence: 0.8,
      direction: 'holding',
      pressure: zeroPressure({ perceptualPause: 0.35 }),
      reasonCodes: ['continuous-adaptive-level'],
    };

    expect(deriveAdaptiveLabel(0.1)).toBe('legacy-recovery');
    expect(deriveAdaptiveLabel(0.9)).toBe('legacy-flow');
    expect(mapAdaptiveStateToPacingOutput({
      state,
      telemetry,
      history: history('en'),
      calibration,
    })).toEqual(mapAdaptiveStateToPacingOutput({
      state,
      telemetry,
      history: history('en'),
      calibration,
    }));
  });
});
