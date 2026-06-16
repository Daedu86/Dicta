import { buildAdaptiveSessionFeedback } from '../core/adaptive/sessionFeedback';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import type { AdaptiveRuntimeSessionInput } from './adaptiveRuntimeTypes';

export type CompleteAdaptiveSessionFeedbackOptions = {
  phraseEvents?: PhrasePlaybackEvent[];
  totalPhrases?: number;
};

export type BuildCompletedAdaptiveSessionFeedbackInput = {
  completedSession: AdaptiveRuntimeSessionInput;
  inputMode: InputMode;
  language: LanguageCode;
  benchmarkBefore: InputLanguageBenchmarkMetrics;
  benchmarkAfter: InputLanguageBenchmarkMetrics;
  phraseEvents: PhrasePlaybackEvent[];
  totalPhrases?: number;
};

export function isBrowserTtsDeFeedbackScope(inputMode: InputMode, language: LanguageCode): boolean {
  return inputMode === 'browser-tts' && language === 'de';
}

export function buildCompletedAdaptiveSessionFeedback({
  completedSession,
  inputMode,
  language,
  benchmarkBefore,
  benchmarkAfter,
  phraseEvents,
  totalPhrases,
}: BuildCompletedAdaptiveSessionFeedbackInput): AdaptiveSessionFeedback {
  return buildAdaptiveSessionFeedback({
    sessionId: completedSession.id,
    inputMode,
    language,
    sourceType: completedSession.sessionSource === 'dictationScript' ? 'dictation_script' : 'plain_text',
    createdAt: completedSession.createdAt,
    completedAt: completedSession.telemetry.finishedAt ?? completedSession.updatedAt ?? new Date().toISOString(),
    scriptId: completedSession.dictationScript
      ? `${completedSession.id}:${completedSession.dictationScript.title}`
      : undefined,
    scriptTitle: completedSession.dictationScript?.title,
    benchmarkBefore,
    benchmarkAfter,
    ttsEnvironment: inputMode === 'browser-tts' ? completedSession.ttsEnvironment ?? null : null,
    phraseEvents,
    totalPhrases,
  });
}
