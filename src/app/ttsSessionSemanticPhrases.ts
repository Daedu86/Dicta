import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type { TtsPacingMode } from '../types/dictation';
import { buildSemanticPhrasesFromDictationScript } from './dictationScriptSemanticPhrases';
import type { StoredSession } from './sessionTypes';
import { buildOrderedSemanticPhrases } from './ttsPacingHelpers';

export function buildSemanticPhrasesForTtsSession(
  activeSession: StoredSession | null,
  text: string,
  language: string | undefined,
  mode: TtsPacingMode,
): SemanticPhrase[] {
  if (activeSession?.sessionSource === 'dictationScript' && activeSession.dictationScript) {
    return buildSemanticPhrasesFromDictationScript(activeSession.dictationScript);
  }
  return buildOrderedSemanticPhrases(text, language, mode);
}
