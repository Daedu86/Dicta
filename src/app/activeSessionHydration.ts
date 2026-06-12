import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import type {
  StoredSession,
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';

export type ActiveSessionHydrationState = {
  difficulty: StoredSession['difficulty'];
  inputSettingsLocked: boolean;
  ttsLanguage: NonNullable<StoredSession['ttsLanguage']>;
  ttsPracticeText: string;
  sessionStatus: StoredSession['status'];
  ttsText: string;
  ttsStatus: TtsStatus;
  ttsCurrentChunk: string;
  ttsPacingMode: 'balanced';
  ttsSpeechRate: number;
  running: boolean;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: StoredSession['metrics']['trend'];
  controllerState: StoredSession['metrics']['controllerState'];
  publishedUi: TtsPublishedUiState;
};

export function createDefaultTtsPublishedUiState(): TtsPublishedUiState {
  return {
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    trend: 'stable',
  };
}

export function buildActiveSessionHydrationState(
  activeSession: StoredSession,
): ActiveSessionHydrationState {
  const hydratedMetrics = activeSession.status === 'finished' ? activeSession.metrics : null;

  return {
    difficulty: activeSession.difficulty,
    inputSettingsLocked: Boolean(activeSession.inputSettingsLocked),
    ttsLanguage: activeSession.ttsLanguage ?? 'de',
    ttsPracticeText: activeSession.ttsPracticeText ?? '',
    sessionStatus: activeSession.status,
    ttsText: activeSession.ttsText ?? '',
    ttsStatus:
      activeSession.inputMode === BROWSER_TTS_SESSION_INPUT_MODE && activeSession.status === 'finished'
        ? 'finished'
        : activeSession.ttsText
          ? 'ready'
          : 'idle',
    ttsCurrentChunk: '',
    ttsPacingMode: 'balanced',
    ttsSpeechRate: 1,
    running: false,
    rate: hydratedMetrics?.rate ?? 1,
    lagSec: hydratedMetrics?.lagSec ?? 0,
    lagWords: hydratedMetrics?.lagWords ?? 0,
    wpm: hydratedMetrics?.wpm ?? 0,
    accuracy: hydratedMetrics?.accuracy ?? 100,
    trend: hydratedMetrics?.trend ?? 'stable',
    controllerState: hydratedMetrics?.controllerState ?? 'hold',
    publishedUi: createDefaultTtsPublishedUiState(),
  };
}
