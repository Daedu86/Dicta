import { describe, expect, it } from 'vitest';
import { buildAdaptivePlaybackComfortProfile } from '../src/core/adaptive/adaptivePlaybackComfortProfile';
import type { HistoricalPerformanceProfile } from '../src/core/adaptive/types';

function history(overrides: Partial<HistoricalPerformanceProfile> = {}): HistoricalPerformanceProfile {
  return {
    language: 'de',
    inputMode: 'browser-tts',
    comfortablePlaybackRate: 0.82,
    averageWpm: 34,
    averageAccuracy: 0.8,
    averageLagSec: 2.1,
    averagePauseMs: 1800,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 1800,
    typicalBackspaceRate: 0.04,
    typicalCorrectionRate: 0.09,
    strugglesWithLongPhrases: true,
    strugglesWithNumbers: false,
    strugglesWithNames: false,
    strugglesWithPunctuation: false,
    improvementTrend: 'stable',
    sessionsCount: 5,
    profileConfidence: 0.75,
    ...overrides,
  };
}

describe('buildAdaptivePlaybackComfortProfile', () => {
  it('opens the global rate and pause windows for learner pressure', () => {
    const profile = buildAdaptivePlaybackComfortProfile({ history: history() });

    expect(profile.source).toBe('history');
    expect(profile.rateRange[0]).toBeGreaterThanOrEqual(0.6);
    expect(profile.rateRange[1]).toBeLessThanOrEqual(1.15);
    expect(profile.pauseRangeMs[0]).toBeGreaterThanOrEqual(1200);
    expect(profile.pauseRangeMs[1]).toBeLessThanOrEqual(4000);
    expect(profile.preferredPhraseSize).toBe('short');
    expect(profile.statePauseMs.recovery).toBeGreaterThan(profile.statePauseMs.support);
    expect(profile.statePauseMs.support).toBeGreaterThanOrEqual(profile.statePauseMs.balanced);
  });

  it('lets a stable language/input pair float toward faster and shorter support', () => {
    const profile = buildAdaptivePlaybackComfortProfile({
      history: history({
        comfortablePlaybackRate: 1,
        averageAccuracy: 0.96,
        averageLagSec: 0.3,
        typicalCorrectionRate: 0.02,
        averagePauseMs: 2200,
        preferredPauseAfterPhraseMs: 2200,
        strugglesWithLongPhrases: false,
        preferredPhraseSize: 'long',
        sessionsCount: 10,
        profileConfidence: 0.95,
      }),
    });

    expect(profile.preferredRate).toBeGreaterThanOrEqual(1);
    expect(profile.preferredPhraseSize).toBe('long');
    expect(profile.statePauseMs.flow).toBeLessThan(profile.statePauseMs.balanced);
  });
});
