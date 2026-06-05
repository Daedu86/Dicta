// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KOKORO_ENABLED_KEY,
  useKokoroRuntime,
  type KokoroRuntime,
  type KokoroRuntimeStatus,
} from '../src/app/useKokoroRuntime';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type RuntimeSnapshot = KokoroRuntime & {
  error: string;
};

type HarnessOptions = {
  localDevFeaturesAvailable: boolean;
  kokoroText: string;
  kokoroStatus: KokoroRuntimeStatus;
  checkHealth: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  startSidecar: ReturnType<typeof vi.fn<() => Promise<void>>>;
  onStopActivePlayback: ReturnType<typeof vi.fn<() => void>>;
  idleTimeoutMs: number;
};

let host: HTMLDivElement;
let root: Root;
let latestRuntime: RuntimeSnapshot | null;
let options: HarnessOptions;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  latestRuntime = null;
  window.localStorage.clear();
  options = createOptions();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useKokoroRuntime', () => {
  it('starts the local sidecar when health is initially unavailable', async () => {
    options.checkHealth.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    options.startSidecar.mockResolvedValue(undefined);
    renderRuntime();

    await act(async () => {
      await getRuntime().toggleKokoroEnabled();
    });

    expect(options.checkHealth).toHaveBeenCalledTimes(2);
    expect(options.startSidecar).toHaveBeenCalledTimes(1);
    expect(getRuntime().kokoroEnabled).toBe(true);
    expect(getRuntime().kokoroServiceReady).toBe(true);
    expect(getRuntime().error).toBe('');
    expect(window.localStorage.getItem(KOKORO_ENABLED_KEY)).toBe('true');
  });

  it('fails closed in hosted builds without starting the local sidecar', async () => {
    options.localDevFeaturesAvailable = false;
    renderRuntime();

    await act(async () => {
      await getRuntime().toggleKokoroEnabled();
    });

    expect(options.checkHealth).not.toHaveBeenCalled();
    expect(options.startSidecar).not.toHaveBeenCalled();
    expect(getRuntime().kokoroEnabled).toBe(false);
    expect(getRuntime().kokoroServiceReady).toBe(false);
    expect(getRuntime().error).toBe('Kokoro is local-only in the Vercel build. Use Input #2 for hosted/mobile practice.');
    expect(window.localStorage.getItem(KOKORO_ENABLED_KEY)).toBe('false');
  });

  it('stops active playback when disabling Kokoro while paused or playing', async () => {
    options.checkHealth.mockResolvedValue(true);
    renderRuntime();

    await act(async () => {
      await getRuntime().toggleKokoroEnabled();
    });

    options.kokoroStatus = 'paused';
    renderRuntime();

    await act(async () => {
      await getRuntime().toggleKokoroEnabled();
    });

    expect(options.onStopActivePlayback).toHaveBeenCalledTimes(1);
    expect(getRuntime().kokoroEnabled).toBe(false);
    expect(getRuntime().error).toBe('');
  });

  it('turns Kokoro off after the idle timeout when text is present but playback is not active', () => {
    vi.useFakeTimers();
    renderRuntime();

    act(() => {
      getRuntime().setKokoroEnabled(true);
    });

    expect(getRuntime().kokoroEnabled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(options.idleTimeoutMs);
    });

    expect(getRuntime().kokoroEnabled).toBe(false);
    expect(getRuntime().error).toBe('Kokoro TTS was turned off after 1 minute of inactivity.');
  });
});

function renderRuntime(): void {
  act(() => {
    root.render(createElement(Harness));
  });
}

function Harness() {
  const [error, setError] = useState('');
  const runtime = useKokoroRuntime({
    ...options,
    setError,
  });
  latestRuntime = {
    ...runtime,
    error,
  };
  return null;
}

function getRuntime(): RuntimeSnapshot {
  if (!latestRuntime) throw new Error('Kokoro runtime did not render.');
  return latestRuntime;
}

function createOptions(): HarnessOptions {
  return {
    localDevFeaturesAvailable: true,
    kokoroText: 'Kokoro text',
    kokoroStatus: 'ready',
    checkHealth: vi.fn(),
    startSidecar: vi.fn(),
    onStopActivePlayback: vi.fn(),
    idleTimeoutMs: 100,
  };
}
