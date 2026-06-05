import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildOpenRouterGenerationPrompt, estimateOpenRouterPromptSize } from '../src/core/adaptive/openRouterGenerationPrompt';
import { buildAdaptiveSessionFeedback } from '../src/core/adaptive/sessionFeedback';
import type { AdaptiveTimelinePoint, PhrasePlaybackEvent } from '../src/core/adaptive/types';

function phraseEvent(
  phraseIndex: number,
  phraseId: string,
  event: PhrasePlaybackEvent['event'],
  timestampMs: number,
): PhrasePlaybackEvent {
  return {
    sessionId: 'session-1',
    phraseId,
    phraseIndex,
    textPreview: `Phrase ${phraseIndex}`,
    event,
    timestampMs,
    inputMode: 'browser-tts',
    language: 'de',
  };
}

function browserTtsDeScoringPoint(index: number): AdaptiveTimelinePoint {
  return {
    timestampMs: 1_800_000_000_000 + index,
    inputMode: 'browser-tts',
    language: 'de',
    mode: 'balanced',
    playbackRate: 0.85,
    accuracy: 0.92,
    lagSec: 0.4,
    rawLagSec: 0.4,
    stableLagSec: 0.4,
    wpm: 52,
    pauseMs: 700,
    phraseBoundaryType: 'sentence',
    semanticCompleteness: 1,
    phraseIndex: index,
    totalSemanticPhrases: 30,
    event: 'phrase_completed',
  };
}

describe('openRouterGenerationPrompt', () => {
  it('includes exact target input mode, language, and voice duration rules', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive',
      durationMinutes: 3,
    });

    expect(payload.prompt).toContain('field "inputMode" must be exactly "browser-tts"');
    expect(payload.prompt).toContain('field "language" must be exactly "de"');
    expect(payload.prompt).toContain('voice playback duration of 3 minutes');
    expect(payload.prompt).toContain('approximately 468 words total');
    expect(payload.prompt).toContain('Create at least 30 phrases');
    expect(payload.prompt).toContain('prefer a slightly longer script over a short one');
    expect(payload.prompt).toContain('generate enough phrase text to match the requested audio length');
    expect(payload.prompt).toContain('"estimatedDurationSec" means the expected time the learner hears the voice/audio');
    expect(payload.prompt).toContain('Compact benchmark context');
  });

  it('uses compact adaptive feedback when latest feedback exists', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-07T10:00:00.000Z',
      phraseEvents: [
        phraseEvent(0, 'p00', 'phrase_started', 1),
        phraseEvent(0, 'p00', 'phrase_replayed', 2),
        phraseEvent(0, 'p00', 'phrase_started', 3),
      ],
      totalPhrases: 1,
    });

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: feedback,
      promptSource: 'compact-adaptive',
      durationMinutes: 2,
    });

    expect(payload.prompt).toContain('"latestSessionFeedback"');
    expect(payload.prompt).toContain('"playbackIssues"');
    expect(payload.prompt).toContain('"repeatedPhraseCount": 1');
    expect(payload.prompt).not.toContain('Compact benchmark context');
  });

  it('builds compact adaptive v2 with exact target fields and output contract', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'es');
    profile.weakAreas = ['lag', 'flow_instability'];
    profile.recommendation = {
      targetRateRange: [0.85, 0.95],
      targetPhraseSize: 'short',
      targetPauseMs: 900,
      nextTrainingFocus: ['shorter phrases', 'stable recovery'],
      confidence: 0.62,
      summary: 'Use shorter phrases with stable recovery pacing.',
    };

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
    });

    expect(payload.prompt).toContain('inputMode "browser-tts"');
    expect(payload.prompt).toContain('language "es"');
    expect(payload.prompt).toContain('Write all phrase text naturally in Spanish.');
    expect(payload.prompt).toContain('"recommendation"');
    expect(payload.prompt).toContain('"targetRateRange"');
    expect(payload.prompt).toContain('"weakAreas"');
    expect(payload.prompt).toContain('"trainingPrescription"');
    expect(payload.prompt).toContain('"profileKey": "browser-tts/es"');
    expect(payload.prompt).toContain('"inputMode": "browser-tts"');
    expect(payload.prompt).toContain('"language": "es"');
    expect(payload.prompt).toContain('The LLM generates structured training material only.');
    expect(payload.prompt).toContain('Dicta runtime and the Adaptive Pace Layer control playback');
    expect(payload.prompt).toContain('Follow trainingPrescription as the pedagogical source of truth.');
    expect(payload.prompt).toContain('Use benchmark and latest feedback as context, but do not override trainingPrescription.');
    expect(payload.prompt).toContain('"lag"');
    expect(payload.prompt).toContain('"title": "Specific content title in the target language"');
    expect(payload.prompt).toContain('"phrases"');
    expect(payload.prompt).toContain('"boundaryType": "clause"');
    expect(payload.prompt).toContain('Create at least 20 phrases');
    expect(payload.prompt).not.toContain('"latestSessionFeedback"');
    expect(payload.prompt).not.toContain('Benchmark context:');
    expect(payload.prompt).not.toContain('LLM prompt:');
  });

  it('uses Portuguese language labels and exact pt output contract', () => {
    const profile = createEmptyInputLanguageBenchmark('cosyvoice-cache', 'pt');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
    });

    expect(payload.prompt).toContain('inputMode "cosyvoice-cache"');
    expect(payload.prompt).toContain('language "pt"');
    expect(payload.prompt).toContain('Write all phrase text naturally in Portuguese.');
    expect(payload.prompt).toContain('"language": "pt"');
  });

  it('keeps compact adaptive v2 context isolated between input-language profiles', () => {
    const browserDeProfile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    browserDeProfile.sessionCount = 30;
    browserDeProfile.sampleCount = 30;
    browserDeProfile.timeline = Array.from({ length: 30 }, (_, index) => browserTtsDeScoringPoint(index));
    browserDeProfile.weakAreas = ['lag'];
    browserDeProfile.recommendation = {
      targetRateRange: [0.8, 0.85],
      targetPhraseSize: 'short',
      targetPauseMs: 1200,
      nextTrainingFocus: ['German browser recovery only'],
      confidence: 0.8,
      summary: 'German browser recovery only.',
    };

    const cosyvoicePtProfile = createEmptyInputLanguageBenchmark('cosyvoice-cache', 'pt');
    cosyvoicePtProfile.weakAreas = ['flow_instability'];
    cosyvoicePtProfile.recommendation = {
      targetRateRange: [0.9, 1],
      targetPhraseSize: 'medium',
      targetPauseMs: 700,
      nextTrainingFocus: ['Portuguese cache fluency only'],
      confidence: 0.7,
      summary: 'Portuguese cache fluency only.',
    };

    const browserDePayload = buildOpenRouterGenerationPrompt({
      profile: browserDeProfile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 3,
    });
    const cosyvoicePtPayload = buildOpenRouterGenerationPrompt({
      profile: cosyvoicePtProfile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 1,
    });

    expect(browserDePayload.prompt).toContain('inputMode "browser-tts"');
    expect(browserDePayload.prompt).toContain('language "de"');
    expect(browserDePayload.prompt).toContain('"profileKey": "browser-tts/de"');
    expect(browserDePayload.prompt).toContain('"trainingPrescription"');
    expect(browserDePayload.prompt).toContain('Write all phrase text naturally in German.');
    expect(browserDePayload.prompt).toContain('"language": "de"');
    expect(browserDePayload.prompt).toContain('German browser recovery only.');
    expect(browserDePayload.prompt).not.toContain('Portuguese cache fluency only.');

    expect(cosyvoicePtPayload.prompt).toContain('inputMode "cosyvoice-cache"');
    expect(cosyvoicePtPayload.prompt).toContain('language "pt"');
    expect(cosyvoicePtPayload.prompt).toContain('"profileKey": "cosyvoice-cache/pt"');
    expect(cosyvoicePtPayload.prompt).toContain('"trainingPrescription"');
    expect(cosyvoicePtPayload.prompt).toContain('Write all phrase text naturally in Portuguese.');
    expect(cosyvoicePtPayload.prompt).toContain('"language": "pt"');
    expect(cosyvoicePtPayload.prompt).toContain('Portuguese cache fluency only.');
    expect(cosyvoicePtPayload.prompt).not.toContain('German browser recovery only.');
  });

  it('includes compact adaptive v2 feedback only when feedback is provided', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-07T10:00:00.000Z',
      phraseEvents: [
        phraseEvent(0, 'p00', 'phrase_started', 1),
        phraseEvent(0, 'p00', 'phrase_replayed', 2),
        phraseEvent(0, 'p00', 'phrase_started', 3),
      ],
      totalPhrases: 1,
    });

    const withoutFeedback = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
    });
    const withFeedback = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: feedback,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
    });

    expect(withoutFeedback.prompt).not.toContain('"latestSessionFeedback"');
    expect(withFeedback.prompt).toContain('"latestSessionFeedback"');
    expect(withFeedback.prompt).toContain('"repeatedPhraseCount": 1');
    expect(withFeedback.prompt).toContain('"phraseStats"');
  });

  it('estimates compact adaptive v2 prompt size and keeps it shorter than v1 for populated context', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.sessionCount = 12;
    profile.sampleCount = 48;
    profile.lastUpdatedAt = '2026-05-17T07:39:00.000Z';
    profile.averageAccuracy = 0.88;
    profile.averageWpm = 54;
    profile.averageLagSec = 1.7;
    profile.sweetSpotScore = 0.61;
    profile.semanticFidelityScore = 0.78;
    profile.controlFidelityScore = 0.72;
    profile.learningEffectivenessScore = 0.57;
    profile.flowStabilityScore = 0.69;
    profile.preferredPlaybackRate = 0.9;
    profile.preferredPhraseSize = 'short';
    profile.weakAreas = ['lag', 'replay', 'flow_instability'];
    profile.recommendation = {
      targetRateRange: [0.82, 0.92],
      targetPhraseSize: 'short',
      targetPauseMs: 1000,
      nextTrainingFocus: ['Reduce lag', 'Use shorter replay-safe phrases', 'Stabilize flow'],
      confidence: 0.7,
      summary: 'Use slower short phrases with replay-safe boundaries.',
    };
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-17T07:39:00.000Z',
      phraseEvents: [
        phraseEvent(0, 'p00', 'phrase_started', 1),
        phraseEvent(0, 'p00', 'phrase_replayed', 2),
        phraseEvent(1, 'p01', 'phrase_advanced', 3),
        phraseEvent(3, 'p03', 'phrase_started', 4),
      ],
      totalPhrases: 24,
    });
    const args = {
      profile,
      sessionFeedback: feedback,
      durationMinutes: 3 as const,
      targetDifficulty: 'normal' as const,
      difficultyInstruction: 'Keep phrase-level "difficulty" values in an intermediate range, roughly 0.45-0.65.',
      diversificationHints: [
        'Create clearly different content from recent generated scripts.',
        'Avoid repeating recent openings: Guten Morgen | Heute lernen wir',
      ],
    };
    const v1 = buildOpenRouterGenerationPrompt({ ...args, promptSource: 'compact-adaptive' });
    const v2 = buildOpenRouterGenerationPrompt({ ...args, promptSource: 'compact-adaptive-v2' });
    const v1Size = estimateOpenRouterPromptSize(v1.prompt, {
      promptMode: 'compact-adaptive',
      durationMinutes: 3,
      targetDifficulty: 'normal',
      inputMode: 'browser-tts',
      language: 'de',
    });
    const v2Size = estimateOpenRouterPromptSize(v2.prompt, {
      promptMode: 'compact-adaptive-v2',
      durationMinutes: 3,
      targetDifficulty: 'normal',
      inputMode: 'browser-tts',
      language: 'de',
    });

    expect(v2Size.approximateTokenCount).toBeLessThan(v1Size.approximateTokenCount);
    expect(v2.prompt).not.toContain('You are generating the next dictation training script for Dicta.');
    expect(v2.prompt).not.toContain('Benchmark context:');
    expect(v2.prompt).not.toContain('LLM prompt:');
  });

  it('can request an intermediate two-minute compact adaptive script', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive',
      durationMinutes: 2,
      targetDifficulty: 'normal',
      difficultyInstruction: 'Keep phrase-level "difficulty" values in an intermediate range, roughly 0.45-0.65.',
    });

    expect(payload.prompt).toContain('voice playback duration of 2 minutes');
    expect(payload.prompt).toContain('set "estimatedDurationSec" close to 120');
    expect(payload.prompt).toContain('265-343 words');
    expect(payload.prompt).toContain('Create at least 20 phrases');
    expect(payload.prompt).toContain('field "difficulty" must be exactly "normal"');
    expect(payload.prompt).toContain('intermediate range, roughly 0.45-0.65');
    expect(payload.prompt).toContain('Compact benchmark context');
  });

  it('can request an express one-minute compact adaptive v2 script', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 1,
      targetDifficulty: 'easy',
      difficultyInstruction: 'Use easy content and keep phrase-level "difficulty" values low, roughly 0.25-0.45.',
    });

    expect(payload.prompt).toContain('Target voice playback duration: 1 minute');
    expect(payload.prompt).toContain('set "estimatedDurationSec" close to 60');
    expect(payload.prompt).toContain('133-172 words');
    expect(payload.prompt).toContain('approximately 156 words total');
    expect(payload.prompt).toContain('Create at least 10 phrases');
    expect(payload.prompt).toContain('Set "difficulty" exactly to "easy"');
    expect(payload.trainingPrescription.userIntent).toBe('auto');
    expect(payload.trainingPrescription.difficulty).toBe('easy');
    expect(payload.prompt).toContain('0.25-0.45');
  });

  it('does not let hard target difficulty override an unstable compact adaptive v2 prescription', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.sampleCount = 10;
    profile.sessionCount = 3;
    profile.averageAccuracy = 0.72;
    profile.averageLagSec = 3.5;
    profile.stableAverageLagSec = 3.4;
    profile.p75LagSec = 3.8;
    profile.p90AbsLagSec = 4.6;
    profile.flowStabilityScore = 0.34;
    profile.learningEffectivenessScore = 0.2;
    profile.weakAreas = ['lag', 'low_accuracy', 'unsafe_boundary_pressure', 'support_dependency', 'flow_instability'];
    profile.recommendation = {
      targetRateRange: [1.05, 1.1],
      targetPhraseSize: 'medium',
      targetPauseMs: 700,
      nextTrainingFocus: ['Recover German Browser TTS flow'],
      confidence: 0.22,
      summary: 'Unstable German Browser TTS profile.',
    };

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
      difficultyInstruction: 'Challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
    });

    expect(payload.trainingPrescription.profileKey).toBe('browser-tts/de');
    expect(payload.trainingPrescription.mode).toBe('recover');
    expect(payload.trainingPrescription.difficulty).toBe('easy');
    expect(payload.prompt).toContain('Set "difficulty" exactly to "easy"');
    expect(payload.prompt).toContain('User requested difficulty "hard", resolved trainer difficulty "easy".');
    expect(payload.prompt).toContain('"boundaryPolicy": "strict_semantic"');
    expect(payload.prompt).not.toContain('Set "difficulty" exactly to "hard"');
  });

  it('can request an advanced two-minute compact adaptive script', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive',
      durationMinutes: 2,
      targetDifficulty: 'hard',
      difficultyInstruction: 'Use advanced content and keep phrase-level "difficulty" values high, roughly 0.70-0.90.',
    });

    expect(payload.prompt).toContain('voice playback duration of 2 minutes');
    expect(payload.prompt).toContain('set "estimatedDurationSec" close to 120');
    expect(payload.prompt).toContain('265-343 words');
    expect(payload.prompt).toContain('Create at least 20 phrases');
    expect(payload.prompt).toContain('field "difficulty" must be exactly "hard"');
    expect(payload.prompt).toContain('advanced content');
    expect(payload.prompt).toContain('0.70-0.90');
  });

  it('includes diversification hints when provided', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive',
      durationMinutes: 3,
      diversificationHints: [
        'Do not repeat opener A',
        'Use a different theme than B',
      ],
    });

    expect(payload.prompt).toContain('Diversification constraints:');
    expect(payload.prompt).toContain('1. Do not repeat opener A');
    expect(payload.prompt).toContain('2. Use a different theme than B');
  });

  it('normalizes stale browser-tts DE pressure before building OpenRouter context', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.sampleCount = 2;
    profile.sweetSpotScore = 0.9709;
    profile.flowStabilityScore = 1;
    profile.recommendation = {
      ...profile.recommendation,
      targetRateRange: [1.05, 1.05],
      targetPhraseSize: 'short',
      targetPauseMs: 750,
      nextTrainingFocus: ['Maintain stable pace and medium-length semantic phrases'],
      confidence: 0.0485,
      summary: 'Maintain stable pace and medium-length semantic phrases.',
    };
    profile.timeline = Array.from({ length: 12 }, (_, index) => ({
      timestampMs: Date.now() + index,
      inputMode: 'browser-tts' as const,
      language: 'de',
      mode: 'support' as const,
      playbackRate: 1.05,
      accuracy: 0.7,
      lagSec: index % 4 === 0 ? 3.4 : 1.4,
      rawLagSec: index === 2 ? -46 : 1.4,
      stableLagSec: index === 2 ? -5 : 1.4,
      wpm: 48,
      pauseMs: 1200,
      phraseBoundaryType: index % 3 === 0 ? ('unsafe' as const) : ('clause' as const),
      semanticCompleteness: index % 3 === 0 ? 0.6 : 0.82,
      decisionReason: 'support-needed, replay-blocked-boundary',
      event: 'phrase_advance' as const,
    }));

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-benchmark-only',
      durationMinutes: 3,
    });

    expect(payload.prompt).toContain('"targetRateRange": [\n      0.8,\n      0.85\n    ]');
    expect(payload.prompt).toContain('"targetPauseMs": 1200');
    expect(payload.prompt).toContain('"support_dependency"');
    expect(payload.prompt).not.toContain('"targetRateRange": [\n      1.05,\n      1.05\n    ]');
    expect(payload.prompt).not.toContain('medium-length semantic phrases');
  });
});
