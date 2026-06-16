import type { PhraseSize } from './types';
import {
  boundaryScore,
  isUnsafeSemanticPhrasePair,
  makeSemanticPhraseBoundaryType,
  normalizePlannerLanguage,
  normalizePlannerWord,
  scoreSemanticPhrase,
  targetWordsForPhraseSize,
} from './SemanticPhrasePlannerScoring';
import type {
  SemanticPhrase,
  SemanticPhrasePlaybackState,
} from './SemanticPhrasePlannerTypes';

export type {
  PlannerLanguage,
  SemanticPhrase,
  SemanticPhrasePlaybackState,
} from './SemanticPhrasePlannerTypes';

export function planSemanticPhrases(text: string, language?: string, sizePreference: PhraseSize = 'medium'): SemanticPhrase[] {
  const normalizedLanguage = normalizePlannerLanguage(language);
  const words = text.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  if (words.length === 0) return [];
  const phrases: SemanticPhrase[] = [];
  const targetWords = targetWordsForPhraseSize(sizePreference);
  let start = 0;
  let phraseId = 0;

  while (start < words.length) {
    const scanLimit = Math.min(words.length - 1, start + targetWords + 8);
    const minTarget = Math.min(words.length - 1, start + Math.max(2, targetWords - 3));
    let cut = Math.min(words.length - 1, start + targetWords - 1);
    let bestBoundary: SemanticPhrase['boundaryType'] = 'unsafe';

    for (let i = minTarget; i <= scanLimit; i += 1) {
      const boundary = makeSemanticPhraseBoundaryType(words[i]);
      if (boundary === 'sentence') {
        cut = i;
        bestBoundary = boundary;
        break;
      }
      if (boundary === 'clause') {
        cut = i;
        bestBoundary = boundary;
      } else if (boundary === 'minor' && bestBoundary === 'unsafe') {
        cut = i;
        bestBoundary = boundary;
      }
    }

    const left = normalizePlannerWord(words[cut] ?? '');
    const right = normalizePlannerWord(words[cut + 1] ?? '');
    if (cut < words.length - 1 && isUnsafeSemanticPhrasePair(left, right, normalizedLanguage)) {
      bestBoundary = 'unsafe';
    }
    if (cut >= words.length - 1) {
      bestBoundary = bestBoundary === 'unsafe' ? 'sentence' : bestBoundary;
    }

    const phraseWords = words.slice(start, cut + 1);
    const scores = scoreSemanticPhrase(phraseWords, normalizedLanguage, bestBoundary);
    const canPauseAfter = bestBoundary === 'sentence' || bestBoundary === 'clause';
    const canReplayIndependently = canPauseAfter && scores.semanticCompleteness >= 0.65;
    phrases.push({
      id: `semantic-${phraseId}`,
      text: phraseWords.join(' '),
      language: normalizedLanguage,
      ...scores,
      canPauseAfter,
      canReplayIndependently,
    });
    phraseId += 1;
    start = cut + 1;
  }

  return phrases;
}

export function pickNextPhrase(
  candidates: SemanticPhrase[],
  phraseSize: PhraseSize,
  boundaryStrictness: 'sentence' | 'clause' | 'phrase',
): SemanticPhrase | null {
  if (candidates.length === 0) return null;
  const sizeTarget = targetWordsForPhraseSize(phraseSize);
  const minimumBoundary =
    boundaryStrictness === 'sentence' ? 3 : boundaryStrictness === 'clause' ? 2 : 1;
  let best = candidates[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const boundaryValue = boundaryScore(candidate.boundaryType);
    if (boundaryValue < minimumBoundary) continue;
    const sizePenalty = Math.abs(candidate.wordCount - sizeTarget) / Math.max(1, sizeTarget);
    const score = candidate.semanticCompleteness * 1.4 + boundaryValue * 0.25 - candidate.difficulty * 0.45 - sizePenalty * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export function createSemanticPhrasePlaybackState(): SemanticPhrasePlaybackState {
  return {
    currentPhraseIndex: 0,
    phraseAdvanceCount: 0,
    phraseReplayCount: 0,
    lastPhraseAdvanceReason: 'start',
  };
}

export function advanceSemanticPhrasePlayback(
  state: SemanticPhrasePlaybackState,
  totalPhrases: number,
  reason = 'phrase_complete',
): SemanticPhrasePlaybackState {
  return {
    ...state,
    currentPhraseIndex: Math.min(state.currentPhraseIndex + 1, Math.max(0, totalPhrases)),
    phraseAdvanceCount: state.phraseAdvanceCount + 1,
    lastPhraseAdvanceReason: reason,
  };
}

export function replaySemanticPhrasePlayback(
  state: SemanticPhrasePlaybackState,
  reason = 'replay_phrase',
): SemanticPhrasePlaybackState {
  return {
    ...state,
    phraseReplayCount: state.phraseReplayCount + 1,
    lastPhraseAdvanceReason: reason,
  };
}
