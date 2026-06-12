import { useMemo } from 'react';
import {
  buildFocusedTrainingPresentationState,
  type FocusedTrainingPresentationInput,
} from './focusedTrainingPresentation';

export function useFocusedTrainingPresentationState(options: FocusedTrainingPresentationInput) {
  return useMemo(
    () => buildFocusedTrainingPresentationState(options),
    [
      options.ttsTranscriptWordCount,
      options.ttsHasText,
      options.ttsSpokenWordIndex,
      options.ttsSpeechRate,
      options.ttsLanguage,
      options.ttsBaseWordsPerSecond,
      options.adaptiveSemanticCurrentPhraseIndex,
      options.adaptiveSemanticTotalPhrases,
      options.activeSessionFinished,
      options.ttsPracticeText,
      options.error,
      options.trainingSubmitMessage,
      options.exportMessage,
      options.openRouterJobStatus,
      options.openRouterError,
    ],
  );
}
