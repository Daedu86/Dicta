import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveWorkspaceInputOptions,
  buildAdaptiveWorkspacePresentationState,
  getAdaptiveBenchmarkProfile,
  getLatestAdaptiveFeedback,
} from '../src/app/adaptiveWorkspacePresentation';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback } from '../src/core/adaptive/types';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../src/components/openrouter/types';

function createFeedback(overrides: Partial<AdaptiveSessionFeedback> = {}): AdaptiveSessionFeedback {
  return {
    sessionId: 'session-1',
    inputMode: 'browser-tts',
    language: 'de',
    createdAt: '2026-06-12T10:00:00.000Z',
    sourceType: 'plain_text',
    improvementDelta: {
      accuracyDelta: 0,
      lagDelta: 0,
      wpmDelta: 0,
      sweetSpotScoreDelta: 0,
      semanticFidelityDelta: 0,
      controlFidelityDelta: 0,
      learningEffectivenessDelta: 0,
      flowStabilityDelta: 0,
      overallImprovementScore: 0,
    },
    playbackIssues: {
      repeatedPhraseCount: 0,
      maxRepeatCountForSinglePhrase: 0,
      repeatedPhrases: [],
      skippedPhraseCount: 0,
      skippedPhrases: [],
      outOfOrderAdvanceCount: 0,
      replayAdvancedPhraseCount: 0,
      phraseIndexJumpCount: 0,
    },
    phraseStats: {
      totalPhrases: 0,
      completedPhrases: 0,
      replayCount: 0,
      phraseAdvanceCount: 0,
      averageRepeatsPerPhrase: 0,
    },
    verdict: 'stable',
    notes: [],
    ...overrides,
  };
}

describe('adaptive workspace presentation state', () => {
  it('returns an empty benchmark profile when no stored profile exists', () => {
    const profile = getAdaptiveBenchmarkProfile({
      adaptiveBenchmarksByInputLanguage: {},
      inputMode: 'browser-tts',
      language: 'es',
    });

    expect(profile.inputMode).toBe('browser-tts');
    expect(profile.language).toBe('es');
    expect(profile.sampleCount).toBe(0);
  });

  it('selects the latest feedback for the requested input/language', () => {
    const older = createFeedback({
      sessionId: 'older',
      createdAt: '2026-06-12T09:00:00.000Z',
    });
    const newer = createFeedback({
      sessionId: 'newer',
      createdAt: '2026-06-12T11:00:00.000Z',
    });
    const feedback: AdaptiveSessionFeedbackByInputLanguage = {
      'browser-tts': {
        de: [older, newer],
      },
    };

    expect(
      getLatestAdaptiveFeedback({
        adaptiveSessionFeedbackByInputLanguage: feedback,
        inputMode: 'browser-tts',
        language: 'de',
      })?.sessionId,
    ).toBe('newer');
  });

  it('builds selected and insights diagnostic profiles from independent selectors', () => {
    const selectedBenchmark = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      sampleCount: 7,
    };
    const insightsBenchmark = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'es'),
      sampleCount: 3,
    };
    const benchmarks: AdaptiveBenchmarksByInputLanguage = {
      'browser-tts': {
        de: selectedBenchmark,
        es: insightsBenchmark,
      },
    };
    const feedback: AdaptiveSessionFeedbackByInputLanguage = {
      'browser-tts': {
        de: [createFeedback({ sessionId: 'selected', language: 'de' })],
        es: [createFeedback({ sessionId: 'insights', language: 'es' })],
      },
    };

    const state = buildAdaptiveWorkspacePresentationState({
      adaptiveBenchmarksByInputLanguage: benchmarks,
      adaptiveSessionFeedbackByInputLanguage: feedback,
      selectedBenchmarkInputMode: 'browser-tts',
      selectedBenchmarkLanguage: 'de',
      insightsDiagnosticInputMode: 'browser-tts',
      metricsLanguageView: 'es',
    });

    expect(state.selectedBenchmarkProfile).toBe(selectedBenchmark);
    expect(state.selectedSessionFeedback?.sessionId).toBe('selected');
    expect(state.insightsDiagnosticProfile).toBe(insightsBenchmark);
    expect(state.insightsDiagnosticFeedback?.sessionId).toBe('insights');
  });

  it('derives insights input presentation', () => {
    const state = buildAdaptiveWorkspacePresentationState({
      adaptiveBenchmarksByInputLanguage: {},
      adaptiveSessionFeedbackByInputLanguage: {},
      selectedBenchmarkInputMode: 'browser-tts',
      selectedBenchmarkLanguage: 'de',
      insightsDiagnosticInputMode: 'browser-tts',
      metricsLanguageView: 'de',
    });

    expect(state.insightsDiagnosticInputOptions).toEqual(buildAdaptiveWorkspaceInputOptions());
  });
});
