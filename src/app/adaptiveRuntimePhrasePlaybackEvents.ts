import {
  normalizeBenchmarkLanguage,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputMode, LanguageCode, PhrasePlaybackEvent } from '../core/adaptive/types';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

export type AppendAdaptivePhrasePlaybackEventInput = {
  currentEvents: PhrasePlaybackEvent[];
  sessionId: string;
  event: PhrasePlaybackEvent['event'];
  inputMode: InputMode;
  language: LanguageCode;
  phrase: SemanticPhrase | null | undefined;
  phraseIndex: number;
  timestampMs?: number;
  maxEvents?: number;
};

export function appendAdaptivePhrasePlaybackEvent({
  currentEvents,
  sessionId,
  event,
  inputMode,
  language,
  phrase,
  phraseIndex,
  timestampMs = Date.now(),
  maxEvents = 500,
}: AppendAdaptivePhrasePlaybackEventInput): PhrasePlaybackEvent[] {
  return [
    ...currentEvents,
    {
      sessionId,
      phraseId: phrase?.id ?? `phrase-${phraseIndex}`,
      phraseIndex,
      textPreview: phrase?.text.slice(0, 120) ?? '',
      event,
      timestampMs,
      inputMode,
      language: normalizeBenchmarkLanguage(language),
    },
  ].slice(-maxEvents);
}
