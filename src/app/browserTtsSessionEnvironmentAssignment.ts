import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import type { BrowserTtsVoiceLike } from '../inputs/browserTts/browserTtsVoices';
import type { StoredSession } from './sessionTypes';

export function collectUsedBrowserTtsVoiceURIs(sessions: readonly StoredSession[]): string[] {
  return sessions
    .filter((session) => session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE && session.ttsLanguage)
    .map((session) => session.ttsVoiceURI)
    .filter((voiceURI): voiceURI is string => Boolean(voiceURI));
}

export function shouldAssignMissingBrowserTtsVoiceEnvironment(session: StoredSession): boolean {
  return session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE &&
    session.inputSettingsLocked &&
    Boolean(session.ttsLanguage) &&
    !session.ttsVoiceURI &&
    session.ttsText.trim().length > 0;
}

export function findBrowserTtsVoiceByURI<TVoice extends BrowserTtsVoiceLike>(
  browserTtsVoices: readonly TVoice[],
  voiceURI: string,
): TVoice | null {
  return browserTtsVoices.find((voice) => voice.voiceURI === voiceURI) ?? null;
}
