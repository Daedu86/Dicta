import type { SemanticPhrase } from '../../core/adaptive/SemanticPhrasePlanner';
import { COSYVOICE_CACHE_INPUT_MODE } from '../../core/adaptive/inputModes';
import { buildQwenCloudPhraseId, type QwenCloudManifest, type QwenCloudPhrase } from './qwenCloudAudioAdapter';

const QWEN_CACHE_BASE_PATH = '/tts-cache/cosyvoice';

function resolveQwenCacheAudioUrl(phraseId: string, language: string): string {
  const parts = phraseId.split(':');
  const hash = parts.length === 2 ? parts[1] : phraseId;
  return `${QWEN_CACHE_BASE_PATH}/${language}/${hash}.wav`;
}

export function buildQwenCloudCacheManifestFromSemanticPhrases(
  semanticPhrases: SemanticPhrase[],
  language: string,
): QwenCloudManifest {
  const phrases: QwenCloudPhrase[] = semanticPhrases
    .filter((phrase) => Boolean(phrase.text.trim()))
    .map((phrase) => {
      const phraseId = buildQwenCloudPhraseId(phrase.text, language);
      return {
        id: phraseId,
        language,
        text: phrase.text,
        audioUrl: resolveQwenCacheAudioUrl(phraseId, language),
        durationMs: undefined,
        wordCount: phrase.wordCount,
        charCount: phrase.charCount,
        difficulty: phrase.difficulty,
        engine: COSYVOICE_CACHE_INPUT_MODE,
      };
    });

  return {
    engine: COSYVOICE_CACHE_INPUT_MODE,
    language,
    phrases,
  };
}

export function qwenCloudCacheManifestJson(manifest: QwenCloudManifest): string {
  return JSON.stringify(manifest, null, 2);
}
