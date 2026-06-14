import type { TtsLanguage } from './sessionTypes';
import { getTtsVoiceLang } from './appRuntimeHelpers';

export interface BrowserTtsUtteranceConfigurationInput {
  utterance: SpeechSynthesisUtterance;
  rate: number;
  language: TtsLanguage;
  voice: SpeechSynthesisVoice | null;
}

export function configureBrowserTtsUtterance({
  utterance,
  rate,
  language,
  voice,
}: BrowserTtsUtteranceConfigurationInput): SpeechSynthesisUtterance {
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = getTtsVoiceLang(language);

  if (voice) {
    utterance.voice = voice;
  }

  return utterance;
}
