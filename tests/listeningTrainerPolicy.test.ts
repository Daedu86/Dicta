import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildListeningTrainingPrescription } from '../src/core/adaptive/ListeningTrainerPolicy';
import { createDefaultListeningPrecisionMetrics } from '../src/core/adaptive/listeningPrecisionMetrics';
import type { InputLanguageBenchmarkMetrics } from '../src/core/adaptive/types';

function stableProfile(inputMode: InputLanguageBenchmarkMetrics['inputMode'], language: string): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark(inputMode, language);
  profile.sessionCount = 12;
  profile.sampleCount = 48;
  profile.averageAccuracy = 0.86;
  profile.averageLagSec = 0.8;
  profile.stableAverageLagSec = 0.8;
  profile.p75LagSec = 0.9;
  profile.p90AbsLagSec = 1.4;
  profile.averageWpm = 52;
  profile.flowStabilityScore = 0.84;
  profile.learningEffectivenessScore = 0.62;
  profile.sweetSpotScore = 0.78;
  profile.preferredPlaybackRate = 1;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 650;
  profile.weakAreas = [];
  profile.recommendation = {
    targetRateRange: [0.95, 1.05],
    targetPhraseSize: 'medium',
    targetPauseMs: 650,
    nextTrainingFocus: ['Maintain stable semantic phrases'],
    confidence: 0.82,
    summary: 'Stable profile.',
  };
  return profile;
}

function unstableBrowserTtsDeProfile(): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
  profile.sessionCount = 3;
  profile.sampleCount = 10;
  profile.averageAccuracy = 0.72;
  profile.averageLagSec = 3.6;
  profile.stableAverageLagSec = 3.4;
  profile.p75LagSec = 3.8;
  profile.p90AbsLagSec = 4.6;
  profile.flowStabilityScore = 0.34;
  profile.learningEffectivenessScore = 0.2;
  profile.preferredPlaybackRate = 1.05;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 700;
  profile.weakAreas = ['lag', 'low_accuracy', 'unsafe_boundary_pressure', 'support_dependency', 'flow_instability'];
  profile.recommendation = {
    targetRateRange: [1.05, 1.1],
    targetPhraseSize: 'medium',
    targetPauseMs: 700,
    nextTrainingFocus: ['Recover DE browser TTS flow'],
    confidence: 0.22,
    summary: 'Unstable German Browser TTS profile.',
  };
  return profile;
}

describe('ListeningTrainerPolicy', () => {
  it('allows stable EN challenge intent to produce a hard listening prescription', () => {
    const profile = stableProfile('browser-tts', 'en');
    const before = structuredClone(profile);

    const prescription = buildListeningTrainingPrescription({
      profile,
      userIntent: 'challenge',
      durationMinutes: 3,
      targetDifficulty: 'hard',
    });

    expect(prescription.profileKey).toBe('browser-tts/en');
    expect(prescription.inputMode).toBe('browser-tts');
    expect(prescription.language).toBe('en');
    expect(prescription.mode).toBe('challenge');
    expect(prescription.difficulty).toBe('hard');
    expect(prescription.targetAccuracyBand).toEqual([0.82, 0.88]);
    expect(prescription.phraseDifficultyRange[1]).toBeLessThan(0.9);
    expect(prescription.boundaryPolicy).toBe('normal_semantic');
    expect(prescription.runtimePolicy).toEqual({
      targetRateRange: prescription.targetRateRange,
      targetPauseMs: prescription.targetPauseMs,
      targetPhraseSize: prescription.targetPhraseSize,
      boundaryPolicy: prescription.boundaryPolicy,
    });
    expect(prescription.learningPolicy).toEqual({
      difficulty: prescription.difficulty,
      phraseDifficultyRange: prescription.phraseDifficultyRange,
      phrasePolicy: prescription.phrasePolicy,
      contentGuidance: prescription.contentGuidance,
    });
    expect(profile).toEqual(before);
  });

  it('downgrades unstable browser-tts/de challenge intent to recovery with strict boundaries', () => {
    const profile = unstableBrowserTtsDeProfile();

    const prescription = buildListeningTrainingPrescription({
      profile,
      userIntent: 'challenge',
      durationMinutes: 2,
      targetDifficulty: 'hard',
    });

    expect(prescription.profileKey).toBe('browser-tts/de');
    expect(prescription.mode).toBe('recover');
    expect(prescription.difficulty).toBe('easy');
    expect(prescription.targetPhraseSize).toBe('short');
    expect(prescription.phrasePolicy).toBe('short_safe_semantic');
    expect(prescription.boundaryPolicy).toBe('strict_semantic');
    expect(prescription.targetRateRange[1]).toBeLessThanOrEqual(0.95);
    expect(prescription.runtimePolicy).toEqual({
      targetRateRange: prescription.targetRateRange,
      targetPauseMs: prescription.targetPauseMs,
      targetPhraseSize: prescription.targetPhraseSize,
      boundaryPolicy: prescription.boundaryPolicy,
    });
    expect(prescription.learningPolicy).toEqual({
      difficulty: prescription.difficulty,
      phraseDifficultyRange: prescription.phraseDifficultyRange,
      phrasePolicy: prescription.phrasePolicy,
      contentGuidance: prescription.contentGuidance,
    });
    expect(prescription.rationale.join(' ')).toContain('Requested hard difficulty was adjusted to easy');
    expect(prescription.rationale.join(' ')).toContain('Challenge intent was gated');
  });

  it('chooses recovery for low-confidence auto intent and progress for stable auto intent', () => {
    const lowConfidence = createEmptyInputLanguageBenchmark('browser-tts', 'fr');
    lowConfidence.recommendation = {
      ...lowConfidence.recommendation,
      confidence: 0.1,
    };
    const stable = stableProfile('browser-tts', 'es');

    const lowConfidencePrescription = buildListeningTrainingPrescription({
      profile: lowConfidence,
      userIntent: 'auto',
    });
    const stablePrescription = buildListeningTrainingPrescription({
      profile: stable,
      userIntent: 'auto',
    });

    expect(lowConfidencePrescription.mode).toBe('recover');
    expect(lowConfidencePrescription.difficulty).toBe('easy');
    expect(stablePrescription.mode).toBe('progress');
    expect(stablePrescription.difficulty).toBe('normal');
  });

  it('blocks challenge when listening precision is weak even if accuracy and lag look stable', () => {
    const profile = stableProfile('browser-tts', 'es');
    profile.listeningPrecisionAverages = {
      ...createDefaultListeningPrecisionMetrics(),
      listeningRecallScore: 0.8,
      contentWordRecall: 0.72,
      detailPrecisionScore: 0.74,
      functionWordAccuracy: 0.76,
      wordOrderAccuracy: 0.78,
      omissionRate: 0.2,
      completionWindowScore: 0.82,
    };

    const prescription = buildListeningTrainingPrescription({
      profile,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });

    expect(prescription.mode).toBe('recover');
    expect(prescription.difficulty).toBe('easy');
    expect(prescription.targetRateRange[1]).toBeLessThanOrEqual(0.95);
    expect(prescription.targetPhraseSize).toBe('short');
    expect(prescription.boundaryPolicy).toBe('strict_semantic');
    expect(prescription.rationale.join(' ')).toContain('Listening precision pressure');
    expect(prescription.contentGuidance.join(' ')).toContain('content-word anchors');
  });

  it('uses completion-window pressure to stabilize instead of challenging', () => {
    const profile = stableProfile('browser-tts', 'pt');
    profile.listeningPrecisionAverages = {
      ...createDefaultListeningPrecisionMetrics(),
      completionWindowScore: 0.74,
      lateCompletionRate: 0.26,
    };

    const prescription = buildListeningTrainingPrescription({
      profile,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });

    expect(prescription.mode).toBe('stabilize');
    expect(prescription.difficulty).toBe('normal');
    expect(prescription.targetRateRange[1]).toBeLessThanOrEqual(1);
    expect(prescription.targetPauseMs).toBeGreaterThanOrEqual(800);
    expect(prescription.boundaryPolicy).toBe('strict_semantic');
    expect(prescription.pacingGuidance.join(' ')).toContain('Precision pressure is active');
    expect(prescription.rationale.join(' ')).toContain('completion window score');
  });

  it('keeps browser-tts/en and browser-tts/de prescriptions independent and deterministic', () => {
    const enProfile = deepFreeze(stableProfile('browser-tts', 'en'));
    const deProfile = deepFreeze(unstableBrowserTtsDeProfile());

    const firstEn = buildListeningTrainingPrescription({ profile: enProfile, userIntent: 'auto' });
    const secondEn = buildListeningTrainingPrescription({ profile: enProfile, userIntent: 'auto' });
    const de = buildListeningTrainingPrescription({ profile: deProfile, userIntent: 'auto' });

    expect(firstEn).toEqual(secondEn);
    expect(firstEn.profileKey).toBe('browser-tts/en');
    expect(firstEn.language).toBe('en');
    expect(firstEn.mode).toBe('progress');
    expect(de.profileKey).toBe('browser-tts/de');
    expect(de.language).toBe('de');
    expect(de.mode).toBe('recover');
    expect(firstEn.contentGuidance.join(' ')).not.toContain('DE browser TTS');
    expect(de.rationale.join(' ')).not.toContain('browser-tts/en');
  });
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}
