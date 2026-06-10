import { isSupportedLanguage, type SupportedLanguage } from '../core/languages';
import { BROWSER_TTS_SESSION_INPUT_MODE, type SessionInputMode } from '../core/sessionInputModes';

type TtsLanguage = SupportedLanguage;

export type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';

export function isSessionStatus(value: unknown): value is SessionStatus {
  return value === 'ready' || value === 'running' || value === 'paused' || value === 'finished' || value === 'error';
}

export function coerceSessionInputMode(value: unknown): SessionInputMode | null {
  return value === BROWSER_TTS_SESSION_INPUT_MODE ? value : null;
}

export function mapDictationScriptInputModeToSession(inputMode: string): SessionInputMode | null {
  const normalized = String(inputMode).trim().toLowerCase().replace(/_/g, '-');

  if (normalized === BROWSER_TTS_SESSION_INPUT_MODE || normalized === 'browser-tts' || normalized === 'browsertts') {
    return BROWSER_TTS_SESSION_INPUT_MODE;
  }

  return null;
}

export function scriptLanguageToTtsLanguage(language: string): TtsLanguage {
  if (isSupportedLanguage(language)) {
    return language;
  }

  return 'en';
}
