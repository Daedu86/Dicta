import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildListeningTrainingPrescription } from '../../src/core/adaptive/ListeningTrainerPolicy';
import {
  stableListeningProfile,
  unstableBrowserTtsDeListeningProfile,
} from '../helpers/listeningTrainerPolicyFixtures';

describe('ListeningTrainerPolicy core prescriptions', () => {
  it('allows stable EN challenge intent to produce a hard listening prescription', () => {
    const profile = stableListeningProfile('browser-tts', 'en');
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
    expect(profile).toEqual(before);
  });

  it('downgrades unstable browser-tts/de challenge intent to recovery with strict boundaries', () => {
    const prescription = buildListeningTrainingPrescription({
      profile: unstableBrowserTtsDeListeningProfile(),
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
    expect(prescription.targetRateRange[1]).toBeLessThanOrEqual(1.1);
    expect(prescription.targetRateRange[1]).toBeGreaterThan(0.95);
    expect(prescription.rationale.join(' ')).toContain('Requested hard difficulty was adjusted to easy');
    expect(prescription.rationale.join(' ')).toContain('Challenge intent was gated');
  });

  it('chooses recovery for low-confidence auto intent and progress for stable auto intent', () => {
    const lowConfidence = createEmptyInputLanguageBenchmark('browser-tts', 'fr');
    lowConfidence.recommendation = {
      ...lowConfidence.recommendation,
      confidence: 0.1,
    };

    const lowConfidencePrescription = buildListeningTrainingPrescription({
      profile: lowConfidence,
      userIntent: 'auto',
    });
    const stablePrescription = buildListeningTrainingPrescription({
      profile: stableListeningProfile('browser-tts', 'es'),
      userIntent: 'auto',
    });

    expect(lowConfidencePrescription.mode).toBe('recover');
    expect(lowConfidencePrescription.difficulty).toBe('easy');
    expect(stablePrescription.mode).toBe('progress');
    expect(stablePrescription.difficulty).toBe('normal');
  });
});
