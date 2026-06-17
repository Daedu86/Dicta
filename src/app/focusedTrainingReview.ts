import { evaluateTranscriptAttempt } from '../core/evaluation';
import {
  buildEvaluationTranscript,
  buildTrainingReviewAlignmentMaps,
  buildTokenizedWords,
} from './focusedTrainingReviewTokenUtils';
import { buildTargetWords, buildTypedWords, isExtraTypedWord } from './focusedTrainingReviewWordBuilders';

export type TrainingReviewWordState = 'matched' | 'missing' | 'extra' | 'typo';

export type TrainingReviewWord = {
  id: string;
  text: string;
  displayText: string;
  state: TrainingReviewWordState;
  exact: boolean;
  hintText?: string;
};

export type TrainingReviewModel = {
  targetWords: TrainingReviewWord[];
  typedWords: TrainingReviewWord[];
  extraTypedWords: TrainingReviewWord[];
  alignedPairs?: { typedIndex: number; targetIndex: number; exact: boolean }[];
  matchedCount: number;
  missedCount: number;
  extraCount: number;
  accuracy: number;
};

export type TrainingReviewToken = {
  text: string;
  normalized: string;
};

export function buildFocusedTrainingReview(targetText: string, typedText: string): TrainingReviewModel {
  const targetTokens = buildTokenizedWords(targetText);
  const typedTokens = buildTokenizedWords(typedText);
  const evaluation = evaluateTranscriptAttempt(typedText, buildEvaluationTranscript(targetTokens));
  const alignmentMaps = buildTrainingReviewAlignmentMaps(evaluation.alignedPairs);
  const targetWords = buildTargetWords(alignmentMaps, targetTokens, typedTokens);
  const typedWords = buildTypedWords(alignmentMaps, typedTokens, targetTokens);

  return {
    targetWords,
    typedWords,
    extraTypedWords: typedWords.filter(isExtraTypedWord),
    alignedPairs: evaluation.alignedPairs,
    matchedCount: evaluation.matchedWords,
    missedCount: evaluation.missedWords,
    extraCount: evaluation.extraWords,
    accuracy: evaluation.accuracy,
  };
}
