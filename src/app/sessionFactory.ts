import { cloneTelemetry } from '../core/sessionNormalization';
import { detectCreatedDeviceMetadata } from '../core/sessionDevice';
import { BROWSER_TTS_SESSION_INPUT_MODE, type SessionInputMode } from '../core/sessionInputModes';

type TtsLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt';

type SessionMetrics = ReturnType<typeof createDefaultMetrics>;

export type StoredSessionFactorySession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputMode: SessionInputMode;
  inputSettingsLocked: boolean;
  ttsText: string;
  ttsLanguage: TtsLanguage | null;
  ttsVoiceURI: string | null;
  ttsPracticeText: string;
  difficulty: 'normal';
  status: 'ready' | 'error';
  metrics: SessionMetrics;
  telemetry: ReturnType<typeof cloneTelemetry>;
  sessionSource: 'plainText';
  generationOrigin: 'manual';
  dictationScript: null;
  generationError?: string;
} & ReturnType<typeof detectCreatedDeviceMetadata>;

export function createDefaultMetrics() {
  return {
    controllerState: 'hold' as const,
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 0,
    trend: 'stable' as const,
    score: 0,
    points: 0,
  };
}

export function createStoredSession(index = 1, inputMode: SessionInputMode = BROWSER_TTS_SESSION_INPUT_MODE, name?: string): StoredSessionFactorySession {
  const now = new Date().toISOString();
  const deviceMetadata = detectCreatedDeviceMetadata();

  return {
    id: crypto.randomUUID(),
    name: name?.trim() || `Session ${index}`,
    createdAt: now,
    updatedAt: now,
    inputMode,
    inputSettingsLocked: false,
    ttsText: '',
    ttsLanguage: inputMode === BROWSER_TTS_SESSION_INPUT_MODE ? 'de' : null,
    ttsVoiceURI: null,
    ttsPracticeText: '',
    difficulty: 'normal' as const,
    status: 'ready' as const,
    metrics: createDefaultMetrics(),
    telemetry: cloneTelemetry(null),
    sessionSource: 'plainText' as const,
    generationOrigin: 'manual' as const,
    ...deviceMetadata,
    dictationScript: null,
  };
}

export function createGeneratedErrorSession({
  index,
  inputMode,
  language,
  name,
  message,
}: {
  index: number;
  inputMode: SessionInputMode;
  language: TtsLanguage;
  name: string;
  message: string;
}): StoredSessionFactorySession & {
  inputSettingsLocked: true;
  status: 'error';
  generationError: string;
  ttsLanguage: TtsLanguage;
} {
  return {
    ...createStoredSession(index, inputMode, name),
    inputSettingsLocked: true,
    status: 'error',
    generationError: message,
    ttsLanguage: language,
  };
}
