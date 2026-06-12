export type FocusedTrainingMessageTone = 'error' | 'success' | 'hint';

export type FocusedTrainingPresentationInput = {
  ttsTranscriptWordCount: number;
  ttsHasText: boolean;
  ttsSpokenWordIndex: number;
  ttsSpeechRate: number;
  ttsLanguage: string | null | undefined;
  ttsBaseWordsPerSecond: number;
  adaptiveSemanticCurrentPhraseIndex: number;
  adaptiveSemanticTotalPhrases: number;
  activeSessionFinished: boolean;
  ttsPracticeText: string;
  error: string;
  trainingSubmitMessage: string;
  exportMessage: string;
  openRouterJobStatus: string;
  openRouterError: string;
};

export type FocusedTrainingPresentationState = {
  ttsPlayerWordCount: number;
  ttsPlayerCurrentWord: number;
  ttsPlayerWordsPerSecond: number;
  ttsPlayerDurationSec: number;
  ttsPlayerCurrentSec: number;
  ttsPlayerProgressPercent: number;
  focusedProgressLabel: string;
  focusedSourceLabel: string;
  focusedTextValue: string;
  focusedTextPlaceholder: string;
  focusedTrainingMessage: string;
  focusedTrainingMessageTone: FocusedTrainingMessageTone;
};

export function clampFocusedProgress(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildFocusedProgressLabel({
  adaptiveSemanticCurrentPhraseIndex,
  adaptiveSemanticTotalPhrases,
  ttsPlayerCurrentWord,
  ttsPlayerWordCount,
}: {
  adaptiveSemanticCurrentPhraseIndex: number;
  adaptiveSemanticTotalPhrases: number;
  ttsPlayerCurrentWord: number;
  ttsPlayerWordCount: number;
}): string {
  if (adaptiveSemanticTotalPhrases > 0) {
    return `Phrase ${Math.min(adaptiveSemanticCurrentPhraseIndex + 1, adaptiveSemanticTotalPhrases)}/${adaptiveSemanticTotalPhrases}`;
  }

  if (ttsPlayerWordCount > 0) {
    return `Word ${Math.min(ttsPlayerCurrentWord, ttsPlayerWordCount)}/${ttsPlayerWordCount}`;
  }

  return 'No source loaded';
}

export function buildFocusedSourceLabel({
  ttsHasText,
  ttsTranscriptWordCount,
  ttsLanguage,
}: {
  ttsHasText: boolean;
  ttsTranscriptWordCount: number;
  ttsLanguage: string | null | undefined;
}): string {
  return ttsHasText
    ? `${ttsTranscriptWordCount} words Â· ${ttsLanguage?.toUpperCase()}`
    : 'TTS source not loaded';
}

export function buildFocusedTrainingMessage({
  error,
  trainingSubmitMessage,
  exportMessage,
  openRouterJobStatus,
  openRouterError,
}: {
  error: string;
  trainingSubmitMessage: string;
  exportMessage: string;
  openRouterJobStatus: string;
  openRouterError: string;
}): string {
  return error || trainingSubmitMessage || [exportMessage, openRouterJobStatus, openRouterError].filter(Boolean).join(' ');
}

export function buildFocusedTrainingMessageTone({
  error,
  trainingSubmitMessage,
}: {
  error: string;
  trainingSubmitMessage: string;
}): FocusedTrainingMessageTone {
  if (error) return 'error';
  if (trainingSubmitMessage) return 'success';
  return 'hint';
}

export function buildFocusedTrainingPresentationState({
  ttsTranscriptWordCount,
  ttsHasText,
  ttsSpokenWordIndex,
  ttsSpeechRate,
  ttsLanguage,
  ttsBaseWordsPerSecond,
  adaptiveSemanticCurrentPhraseIndex,
  adaptiveSemanticTotalPhrases,
  activeSessionFinished,
  ttsPracticeText,
  error,
  trainingSubmitMessage,
  exportMessage,
  openRouterJobStatus,
  openRouterError,
}: FocusedTrainingPresentationInput): FocusedTrainingPresentationState {
  const ttsPlayerWordCount = ttsTranscriptWordCount;
  const ttsPlayerCurrentWord = ttsHasText ? ttsSpokenWordIndex : 0;
  const ttsPlayerWordsPerSecond = Math.max(1, ttsBaseWordsPerSecond * ttsSpeechRate);
  const ttsPlayerDurationSec = ttsPlayerWordCount > 0 ? ttsPlayerWordCount / ttsPlayerWordsPerSecond : 0;
  const ttsPlayerCurrentSec =
    ttsPlayerWordCount > 0
      ? Math.min(ttsPlayerDurationSec, (ttsPlayerCurrentWord / ttsPlayerWordCount) * ttsPlayerDurationSec)
      : 0;
  const ttsPlayerProgressPercent =
    ttsPlayerDurationSec > 0 ? clampFocusedProgress((ttsPlayerCurrentSec / ttsPlayerDurationSec) * 100, 0, 100) : 0;

  return {
    ttsPlayerWordCount,
    ttsPlayerCurrentWord,
    ttsPlayerWordsPerSecond,
    ttsPlayerDurationSec,
    ttsPlayerCurrentSec,
    ttsPlayerProgressPercent,
    focusedProgressLabel: buildFocusedProgressLabel({
      adaptiveSemanticCurrentPhraseIndex,
      adaptiveSemanticTotalPhrases,
      ttsPlayerCurrentWord,
      ttsPlayerWordCount,
    }),
    focusedSourceLabel: buildFocusedSourceLabel({
      ttsHasText,
      ttsTranscriptWordCount,
      ttsLanguage,
    }),
    focusedTextValue: ttsPracticeText,
    focusedTextPlaceholder: activeSessionFinished ? 'Session submitted.' : 'Type the dictation here...',
    focusedTrainingMessage: buildFocusedTrainingMessage({
      error,
      trainingSubmitMessage,
      exportMessage,
      openRouterJobStatus,
      openRouterError,
    }),
    focusedTrainingMessageTone: buildFocusedTrainingMessageTone({
      error,
      trainingSubmitMessage,
    }),
  };
}
