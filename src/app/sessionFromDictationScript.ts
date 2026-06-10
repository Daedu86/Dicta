import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import { formatSupportedLanguage } from '../core/languages';
import type { SessionInputMode } from '../core/sessionInputModes';
import { chooseRandomBrowserTtsVoiceURIForSession } from '../inputs/browserTts/browserTtsVoices';
import { normalizeGeneratedDictationScriptTitle } from './generatedDictationScriptTitle';
import { createStoredSession } from './sessionFactory';
import { scriptLanguageToTtsLanguage } from './sessionRestoreGuards';

type DictationScriptSession = Omit<
  ReturnType<typeof createStoredSession>,
  'difficulty' | 'sessionSource' | 'dictationScript' | 'ttsText' | 'ttsLanguage' | 'ttsVoiceURI'
> & {
  difficulty: DictationScript['difficulty'];
  sessionSource: 'dictationScript';
  dictationScript: DictationScript;
  ttsText: string;
  ttsLanguage: ReturnType<typeof scriptLanguageToTtsLanguage>;
  ttsVoiceURI: string | null;
};

export function createSessionFromScript(
  script: DictationScript,
  index: number,
  inputMode: SessionInputMode,
  options: { browserTtsVoices?: readonly SpeechSynthesisVoice[] } = {},
): DictationScriptSession {
  const titledScript = normalizeGeneratedDictationScriptTitle(script, formatSupportedLanguage);
  const text = titledScript.phrases.map((phrase) => phrase.text).join(' ');
  const language = scriptLanguageToTtsLanguage(titledScript.language);
  const session: DictationScriptSession = {
    ...createStoredSession(index, inputMode, titledScript.title),
    inputSettingsLocked: true,
    difficulty: titledScript.difficulty,
    sessionSource: 'dictationScript',
    dictationScript: titledScript,
    ttsText: text,
    ttsLanguage: language,
    ttsVoiceURI: chooseRandomBrowserTtsVoiceURIForSession(
      inputMode,
      options.browserTtsVoices ?? [],
      language,
      seededUnitInterval(`${inputMode}:${language}:${index}:${titledScript.title}`),
    ),
  };

  

  return session;
}

function seededUnitInterval(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => (hash >>> 0) / 0x100000000;
}
