import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { applyCompletedChunkPunctuation } from './completedChunkPunctuation';
import type { StateSetter, WritableRef } from './useTtsPlaybackControlsTypes';

type ApplyPendingTtsPracticePunctuationInput = {
  activeInputMode: string;
  ttsText: string;
  completedWordCount: number;
  ttsPracticeLiveTextRef: WritableRef<string>;
  setTtsPracticeText: StateSetter<string>;
  latestPracticeText?: string;
};

export function applyPendingTtsPracticePunctuation({
  activeInputMode,
  ttsText,
  completedWordCount,
  ttsPracticeLiveTextRef,
  setTtsPracticeText,
  latestPracticeText,
}: ApplyPendingTtsPracticePunctuationInput): string {
  const typedText = latestPracticeText ?? ttsPracticeLiveTextRef.current;
  ttsPracticeLiveTextRef.current = typedText;

  if (activeInputMode !== BROWSER_TTS_SESSION_INPUT_MODE || !ttsText.trim() || !typedText.trim()) {
    return typedText;
  }

  const punctuatedText = applyCompletedChunkPunctuation({
    targetText: ttsText,
    typedText,
    completedWordCount,
  });
  if (punctuatedText === typedText) return typedText;

  ttsPracticeLiveTextRef.current = punctuatedText;
  setTtsPracticeText(punctuatedText);
  return punctuatedText;
}
