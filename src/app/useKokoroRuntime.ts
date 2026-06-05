import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { checkKokoroHealth, startKokoroSidecar } from '../core/kokoroClient';

export const KOKORO_ENABLED_KEY = 'dicta.kokoroEnabled.v1';

export type KokoroRuntimeStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

type KokoroRuntimeOptions = {
  localDevFeaturesAvailable: boolean;
  kokoroText: string;
  kokoroStatus: KokoroRuntimeStatus;
  setError: Dispatch<SetStateAction<string>>;
  onStopActivePlayback: () => void;
  checkHealth?: () => Promise<boolean>;
  startSidecar?: () => Promise<void>;
  pollAttempts?: number;
  pollIntervalMs?: number;
  idleTimeoutMs?: number;
};

export type KokoroRuntime = {
  kokoroEnabled: boolean;
  kokoroServiceReady: boolean | null;
  setKokoroEnabled: Dispatch<SetStateAction<boolean>>;
  setKokoroServiceReady: Dispatch<SetStateAction<boolean | null>>;
  ensureKokoroServiceRunning: () => Promise<boolean>;
  toggleKokoroEnabled: () => Promise<void>;
};

const HOSTED_KOKORO_MESSAGE = 'Kokoro is local-only in the Vercel build. Use Input #2 for hosted/mobile practice.';
const START_FAILURE_MESSAGE = 'Could not start Kokoro service. Check services/kokoro_tts/.venv and try again.';
const IDLE_TIMEOUT_MESSAGE = 'Kokoro TTS was turned off after 1 minute of inactivity.';

export function useKokoroRuntime({
  localDevFeaturesAvailable,
  kokoroText,
  kokoroStatus,
  setError,
  onStopActivePlayback,
  checkHealth = checkKokoroHealth,
  startSidecar = startKokoroSidecar,
  pollAttempts = 20,
  pollIntervalMs = 250,
  idleTimeoutMs = 60_000,
}: KokoroRuntimeOptions): KokoroRuntime {
  const [kokoroServiceReady, setKokoroServiceReady] = useState<boolean | null>(null);
  const [kokoroEnabled, setKokoroEnabled] = useState<boolean>(false);

  useEffect(() => {
    window.localStorage.setItem(KOKORO_ENABLED_KEY, JSON.stringify(kokoroEnabled));
  }, [kokoroEnabled]);

  useEffect(() => {
    if (!localDevFeaturesAvailable && kokoroEnabled) {
      setKokoroEnabled(false);
      setKokoroServiceReady(false);
      setError(HOSTED_KOKORO_MESSAGE);
    }
  }, [kokoroEnabled, localDevFeaturesAvailable, setError]);

  useEffect(() => {
    if (!kokoroEnabled) return;

    if (!kokoroText.trim() && kokoroStatus !== 'playing') {
      setKokoroEnabled(false);
      return;
    }

    if (kokoroStatus === 'playing') return;

    const id = window.setTimeout(() => {
      setKokoroEnabled(false);
      setError((current) => current || IDLE_TIMEOUT_MESSAGE);
    }, idleTimeoutMs);

    return () => window.clearTimeout(id);
  }, [idleTimeoutMs, kokoroEnabled, kokoroStatus, kokoroText, setError]);

  const ensureKokoroServiceRunning = useCallback(async (): Promise<boolean> => {
    if (!localDevFeaturesAvailable) {
      setError(HOSTED_KOKORO_MESSAGE);
      return false;
    }
    if (await checkHealth()) {
      return true;
    }
    await startSidecar();
    for (let index = 0; index < pollAttempts; index += 1) {
      if (await checkHealth()) {
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
    }
    return false;
  }, [checkHealth, localDevFeaturesAvailable, pollAttempts, pollIntervalMs, setError, startSidecar]);

  const toggleKokoroEnabled = useCallback(async (): Promise<void> => {
    if (!localDevFeaturesAvailable) {
      setKokoroServiceReady(false);
      setKokoroEnabled(false);
      setError(HOSTED_KOKORO_MESSAGE);
      return;
    }
    if (kokoroEnabled) {
      if (kokoroStatus === 'playing' || kokoroStatus === 'paused') {
        onStopActivePlayback();
      }
      setError('');
      setKokoroEnabled(false);
      return;
    }

    setError('');
    setKokoroServiceReady(null);
    try {
      const ready = await ensureKokoroServiceRunning();
      setKokoroServiceReady(ready);
      if (!ready) {
        setError(START_FAILURE_MESSAGE);
        setKokoroEnabled(false);
        return;
      }
      setKokoroEnabled(true);
    } catch (error) {
      setKokoroServiceReady(false);
      setKokoroEnabled(false);
      setError(error instanceof Error ? error.message : 'Could not start Kokoro service.');
    }
  }, [ensureKokoroServiceRunning, kokoroEnabled, kokoroStatus, localDevFeaturesAvailable, onStopActivePlayback, setError]);

  return {
    kokoroEnabled,
    kokoroServiceReady,
    setKokoroEnabled,
    setKokoroServiceReady,
    ensureKokoroServiceRunning,
    toggleKokoroEnabled,
  };
}
