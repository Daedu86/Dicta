import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildOpenRouterGenerationPrompt } from '../src/core/adaptive/openRouterGenerationPrompt';
import { buildAdaptiveSessionFeedback } from '../src/core/adaptive/sessionFeedback';
import type { PhrasePlaybackEvent } from '../src/core/adaptive/types';

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
});
