import type { ControlAction } from '../types/dictation';
import type { InputMode, LanguageCode } from '../core/adaptive/types';
import { getDefaultSpeechSynthesisLang } from '../core/languages';
import type { PerformanceTrend, StoredSession, TtsLanguage } from './sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';


export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function averageNumbers(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function mapSessionInputMode(mode: string): InputMode {
  if (mode === BROWSER_TTS_SESSION_INPUT_MODE) return 'browser-tts';
  return 'browser-tts';
  throw new Error('Removed legacy input');
}

export function resolveStoredSessionLanguage(session: StoredSession): LanguageCode {
  return session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE ? (session.ttsLanguage ?? 'unknown') : 'unknown';
}

export function deriveTtsControlAction({
  accuracy,
  lagSec,
  wpm,
  typedWords,
}: {
  accuracy: number;
  lagSec: number;
  wpm: number;
  typedWords: number;
}): ControlAction {
  if (typedWords < 3) return 'hold';
  if (accuracy < 75 || lagSec > 3.2) return 'speed_down';
  if (accuracy >= 92 && Math.abs(lagSec) <= 1.5 && wpm >= 35) return 'speed_up';
  return 'hold';
}

export function derivePerformanceTrend(
  lagSec: number,
  accuracy: number,
  previousLagSec: number,
  previousAccuracy: number,
): PerformanceTrend {
  const lagImproved = Math.abs(lagSec) < Math.abs(previousLagSec) - 0.25;
  const accuracyImproved = accuracy > previousAccuracy + 0.5;
  const worsening = Math.abs(lagSec) > Math.abs(previousLagSec) + 0.4 && accuracy + 1 < previousAccuracy;
  if (lagImproved || accuracyImproved) return 'improving';
  if (worsening) return 'declining';
  return 'stable';
}

export function getTtsVoiceLang(language: TtsLanguage): string {
  return getDefaultSpeechSynthesisLang(language);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

declare global {
  interface Window {
    __DICTA_DEBUG_EXPORT__?: () => Record<string, unknown>;
  }
}
