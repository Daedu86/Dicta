import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { createDefaultTtsPublishedUiState } from './activeSessionHydration';
import type {
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';

export type ResetSessionStateInput = {
  preserveInputSettingsLock?: boolean;
  inputSettingsLocked: boolean;
  ttsText: string;
  activeInputMode: string;
};

export type ResetSessionState = {
  nextInputSettingsLocked: boolean;
  ttsPracticeText: string;
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
  controllerState: TtsPublishedUiState['controllerState'];
  publishedUi: TtsPublishedUiState;
  sessionStatus: 'ready';
  trainingSubmitMessage: string;
  shouldExpandTtsSetup: boolean;
};

export function buildResetSessionState({
  preserveInputSettingsLock,
  inputSettingsLocked,
  ttsText,
  activeInputMode,
}: ResetSessionStateInput): ResetSessionState {
  const nextInputSettingsLocked = preserveInputSettingsLock ? inputSettingsLocked : false;

  return {
    nextInputSettingsLocked,
    ttsPracticeText: '',
    ttsStatus: ttsText.trim() ? 'ready' : 'idle',
    ttsCurrentChunk: '',
    ttsPacingMode: 'balanced',
    ttsSpeechRate: 1,
    running: false,
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    controllerState: 'hold',
    publishedUi: createDefaultTtsPublishedUiState(),
    sessionStatus: 'ready',
    trainingSubmitMessage: '',
    shouldExpandTtsSetup:
      !nextInputSettingsLocked && activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE,
  };
}
