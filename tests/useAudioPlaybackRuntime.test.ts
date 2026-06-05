// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioPlaybackRuntime, type AudioPlaybackRuntime } from '../src/app/useAudioPlaybackRuntime';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let latestRuntime: AudioPlaybackRuntime | null;
let currentAudioUrl: string;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  latestRuntime = null;
  currentAudioUrl = '';
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.restoreAllMocks();
});

describe('useAudioPlaybackRuntime', () => {
  it('loads an explicit source into the audio element and marks it ready', () => {
    renderRuntime('');

    act(() => {
      latestRuntime?.loadAudioSource('blob:dicta-audio', 'Audio loaded successfully: sample.mp3');
    });

    const audio = getAudioElement();
    expect(audio.src).toBe('blob:dicta-audio');
    expect(latestRuntime?.audioReady).toBe(true);
    expect(latestRuntime?.audioReadyMessage).toBe('Audio loaded successfully: sample.mp3');
    expect(latestRuntime?.hasAudioElement()).toBe(true);
    expect(latestRuntime?.hasAudioEngine()).toBe(true);
  });

  it('auto-loads the current audioUrl and preserves an existing ready message', () => {
    renderRuntime('');

    act(() => {
      latestRuntime?.setAudioReadyState(false, 'Audio ready: Saved source');
    });
    renderRuntime('https://example.test/audio.mp3');

    expect(getAudioElement().src).toBe('https://example.test/audio.mp3');
    expect(latestRuntime?.audioReady).toBe(true);
    expect(latestRuntime?.audioReadyMessage).toBe('Audio ready: Saved source');
  });

  it('tracks element time updates and controls seek, rewind, rate, and reset', async () => {
    renderRuntime('');

    await act(async () => {
      latestRuntime?.loadAudioSource('blob:dicta-audio');
      latestRuntime?.setAudioRate(0.85);
      await latestRuntime?.playAudio();
    });

    const audio = getAudioElement();
    expect(audio.playbackRate).toBe(0.85);
    expect(latestRuntime?.getAudioRate()).toBe(0.85);

    act(() => {
      latestRuntime?.seekAudio(12);
    });
    expect(audio.currentTime).toBe(12);
    expect(latestRuntime?.currentAudioTime).toBe(12);

    act(() => {
      latestRuntime?.rewindAudio(5);
    });
    expect(audio.currentTime).toBe(7);
    expect(latestRuntime?.currentAudioTime).toBe(7);

    act(() => {
      audio.currentTime = 9;
      latestRuntime?.handleAudioTimeUpdate();
    });
    expect(latestRuntime?.currentAudioTime).toBe(9);

    act(() => {
      latestRuntime?.resetAudio();
    });
    expect(audio.currentTime).toBe(0);
    expect(audio.playbackRate).toBe(1);
    expect(latestRuntime?.currentAudioTime).toBe(0);
  });
});

function renderRuntime(audioUrl: string): void {
  currentAudioUrl = audioUrl;

  act(() => {
    root.render(createElement(Harness));
  });
}

function Harness() {
  latestRuntime = useAudioPlaybackRuntime(currentAudioUrl);
  return createElement('audio', { ref: latestRuntime.audioRef });
}

function getAudioElement(): HTMLAudioElement {
  const audio = host.querySelector('audio');
  if (!audio) throw new Error('Audio element did not render.');
  return audio;
}
