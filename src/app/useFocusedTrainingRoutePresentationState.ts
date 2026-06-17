import { useFocusedTrainingPresentationState } from './useFocusedTrainingPresentationState';
import type { UseFocusedTrainingRouteRuntimeArgs } from './useFocusedTrainingRouteRuntimeTypes';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

export function useFocusedTrainingRoutePresentationState({
  ttsTranscript,
  ttsHasText,
  estimateTtsSpokenWordIndex,
  ttsSpeechRate,
  ttsLanguage,
  adaptiveSemanticDebug,
  activeSessionFinished,
  ttsPracticeText,
  error,
  trainingSubmitMessage,
  exportMessage,
  openRouterJobStatus,
  openRouterError,
}: UseFocusedTrainingRouteRuntimeArgs) {
  return useFocusedTrainingPresentationState({
    ttsTranscriptWordCount: ttsTranscript?.words.length ?? 0,
    ttsHasText,
    ttsSpokenWordIndex: ttsHasText ? estimateTtsSpokenWordIndex() : 0,
    ttsSpeechRate,
    ttsLanguage,
    ttsBaseWordsPerSecond: TTS_BASE_WORDS_PER_SECOND,
    adaptiveSemanticCurrentPhraseIndex: adaptiveSemanticDebug.currentPhraseIndex,
    adaptiveSemanticTotalPhrases: adaptiveSemanticDebug.totalSemanticPhrases,
    activeSessionFinished,
    ttsPracticeText,
    error,
    trainingSubmitMessage,
    exportMessage,
    openRouterJobStatus,
    openRouterError,
  });
}
