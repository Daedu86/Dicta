import type { DictationScript, DictationScriptIntonationHint } from './dictationScriptValidation';
import type { PhraseBoundaryType, PhraseSize } from './types';
import { FALLBACK_PHRASES, HARD_FALLBACK_PHRASES } from './openRouterFallbackScriptPhrases';
import { buildFallbackTitle, buildTopicSuffix } from './openRouterFallbackScriptText';
import type { FallbackScriptOptions } from './openRouterFallbackScriptTypes';
import { hashSeed, rotate } from './openRouterFallbackScriptUtils';

export function buildFallbackOpenRouterSessionScript(options: FallbackScriptOptions): DictationScript {
  const difficulty = options.targetDifficulty ?? 'normal';
  const seed = `${options.seed ?? new Date().toISOString()}|${options.language}|${options.inputMode}|${options.durationMinutes}|${difficulty}`;
  const seedInt = hashSeed(seed);
  const basePhrases = difficulty === 'hard'
    ? [...FALLBACK_PHRASES[options.language], ...HARD_FALLBACK_PHRASES[options.language]]
    : [...FALLBACK_PHRASES[options.language]];
  const rotatedPhrases = rotate(basePhrases, seedInt % Math.max(1, basePhrases.length));
  const phraseCount = options.durationMinutes * 6;
  const difficultyScore = difficulty === 'hard' ? 0.78 : difficulty === 'easy' ? 0.35 : 0.55;
  const topicSuffix = buildTopicSuffix(options.language, seedInt);
  const recommendedPauseMs = options.language === 'de' ? 760 + (seedInt % 140) : 620 + (seedInt % 120);
  const boundarySequence: PhraseBoundaryType[] = difficulty === 'hard'
    ? ['clause', 'sentence', 'sentence', 'clause', 'minor']
    : ['sentence', 'sentence', 'clause', 'sentence'];

  return {
    title: `${buildFallbackTitle(options.language, options.durationMinutes, difficulty)} - ${topicSuffix}`,
    language: options.language,
    inputMode: options.inputMode,
    difficulty,
    estimatedDurationSec: options.durationMinutes * 60,
    targetSkills: ['accuracy', 'steady pacing', 'phrase recall', topicSuffix.toLowerCase()],
    recommendedRateRange: options.language === 'de' ? [0.8, 0.88] : [0.9, 1],
    recommendedPhraseSize: 'medium' satisfies PhraseSize,
    recommendedPauseMs,
    phrases: Array.from({ length: phraseCount }, (_, index) => ({
      id: `local-fallback-${options.language}-${index + 1}-${Math.abs(seedInt % 9973)}`,
      text: rotatedPhrases[index % rotatedPhrases.length],
      boundaryType: boundarySequence[index % boundarySequence.length],
      pauseAfterMs: recommendedPauseMs + ((index + seedInt) % 3) * 35,
      canReplayIndependently: true,
      requiresContinuation: boundarySequence[index % boundarySequence.length] === 'minor',
      semanticCompleteness: boundarySequence[index % boundarySequence.length] === 'minor' ? 0.74 : 0.95,
      difficulty: difficultyScore,
      emphasisWords: [],
      intonationHint: 'falling' satisfies DictationScriptIntonationHint,
    })),
  };
}
