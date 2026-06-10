import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import { normalizeWord } from '../core/normalization';

export function buildTtsSourceWords(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildSemanticPhrasesFromDictationScript(script: DictationScript): SemanticPhrase[] {
  return script.phrases.map((phrase, index) => {
    const words = buildTtsSourceWords(phrase.text);
    const punctuationLoad = words.length > 0 ? words.filter((word) => /[.!?;:,]/.test(word)).length / words.length : 0;
    const rareWordLoad = words.length > 0 ? words.filter((word) => normalizeWord(word).length >= 10).length / words.length : 0;
    return {
      id: phrase.id || `script-${index}`,
      text: phrase.text,
      language: script.language,
      boundaryType: phrase.boundaryType,
      canPauseAfter: phrase.boundaryType !== 'unsafe' && !phrase.requiresContinuation,
      canReplayIndependently: phrase.canReplayIndependently,
      semanticCompleteness: phrase.semanticCompleteness,
      difficulty: phrase.difficulty,
      wordCount: Math.max(1, words.length),
      charCount: phrase.text.length,
      punctuationLoad,
      rareWordLoad,
      syntaxComplexity: phrase.requiresContinuation ? 0.65 : 0.35,
    };
  });
}
