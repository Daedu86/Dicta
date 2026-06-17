import { describe, expect, it } from 'vitest';
import { buildListeningTrainingPrescription } from '../../src/core/adaptive/ListeningTrainerPolicy';
import { createDefaultListeningPrecisionMetrics } from '../../src/core/adaptive/listeningPrecisionMetrics';
import {
  deepFreeze,
  stableListeningProfile,
  unstableBrowserTtsDeListeningProfile,
} from '../helpers/listeningTrainerPolicyFixtures';

describe('ListeningTrainerPolicy precision pressure', () => {
  it('blocks challenge when listening precision is weak even if accuracy and lag look stable', () => {
    const profile = stableListeningProfile('browser-tts', 'es');
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
    const profile = stableListeningProfile('browser-tts', 'pt');
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
    const enProfile = deepFreeze(stableListeningProfile('browser-tts', 'en'));
    const deProfile = deepFreeze(unstableBrowserTtsDeListeningProfile());

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
