// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrowserTtsRuntime, type BrowserTtsRuntime } from '../src/app/useBrowserTtsRuntime';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type SpeechListener = () => void;
type FakeSpeechSynthesis = SpeechSynthesis & {
  getVoices: ReturnType<typeof vi.fn<() => SpeechSynthesisVoice[]>>;
  speak: ReturnType<typeof vi.fn<(utterance: SpeechSynthesisUtterance) => void>>;
  pause: ReturnType<typeof vi.fn<() => void>>;
  resume: ReturnType<typeof vi.fn<() => void>>;
  cancel: ReturnType<typeof vi.fn<() => void>>;
  addEventListener: ReturnType<typeof vi.fn<(type: string, listener: SpeechListener) => void>>;
  removeEventListener: ReturnType<typeof vi.fn<(type: string, listener: SpeechListener) => void>>;
  emitVoicesChanged: () => void;
};

let host: HTMLDivElement;
let root: Root;
let latestRuntime: BrowserTtsRuntime | null;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  latestRuntime = null;
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  delete (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  vi.restoreAllMocks();
});

describe('useBrowserTtsRuntime', () => {
  it('discovers Browser TTS voices on mount and refreshes when voices change', () => {
    const firstVoice = voiceFixture('de-DE', 'German Voice', 'voice-de');
    const secondVoice = voiceFixture('en-US', 'English Voice', 'voice-en');
    const speech = installSpeechSynthesis([firstVoice]);

    renderRuntime();

    expect(latestRuntime?.browserTtsVoices).toEqual([firstVoice]);
    expect(speech.addEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));

    act(() => {
      speech.getVoices.mockReturnValue([firstVoice, secondVoice]);
      speech.emitVoicesChanged();
    });

    expect(latestRuntime?.browserTtsVoices).toEqual([firstVoice, secondVoice]);

    act(() => {
      root.unmount();
    });

    expect(speech.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
  });

  it('routes speech commands through window.speechSynthesis when supported', () => {
    const speech = installSpeechSynthesis([]);
    renderRuntime();
    const utterance = { text: 'Hallo Welt' } as SpeechSynthesisUtterance;

    expect(latestRuntime?.isBrowserTtsSupported()).toBe(true);
    expect(latestRuntime?.speakBrowserTts(utterance)).toBe(true);
    expect(latestRuntime?.pauseBrowserTts()).toBe(true);
    expect(latestRuntime?.resumeBrowserTts()).toBe(true);
    expect(latestRuntime?.cancelBrowserTts()).toBe(true);

    expect(speech.speak).toHaveBeenCalledWith(utterance);
    expect(speech.pause).toHaveBeenCalledTimes(1);
    expect(speech.resume).toHaveBeenCalledTimes(1);
    expect(speech.cancel).toHaveBeenCalledTimes(1);
  });

  it('reports unsupported browsers without throwing', () => {
    renderRuntime();
    const utterance = { text: 'No support' } as SpeechSynthesisUtterance;

    expect(latestRuntime?.browserTtsVoices).toEqual([]);
    expect(latestRuntime?.isBrowserTtsSupported()).toBe(false);
    expect(latestRuntime?.speakBrowserTts(utterance)).toBe(false);
    expect(latestRuntime?.pauseBrowserTts()).toBe(false);
    expect(latestRuntime?.resumeBrowserTts()).toBe(false);
    expect(latestRuntime?.cancelBrowserTts()).toBe(false);
  });
});

function renderRuntime(): void {
  function Harness() {
    latestRuntime = useBrowserTtsRuntime();
    return null;
  }

  act(() => {
    root.render(createElement(Harness));
  });
}

function installSpeechSynthesis(voices: SpeechSynthesisVoice[]): FakeSpeechSynthesis {
  const listeners = new Set<SpeechListener>();
  const speech = {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn((type: string, listener: SpeechListener) => {
      if (type === 'voiceschanged') listeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: SpeechListener) => {
      if (type === 'voiceschanged') listeners.delete(listener);
    }),
    emitVoicesChanged: () => {
      for (const listener of listeners) listener();
    },
  } as FakeSpeechSynthesis;

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: speech,
  });

  return speech;
}

function voiceFixture(lang: string, name: string, voiceURI: string): SpeechSynthesisVoice {
  return {
    lang,
    name,
    voiceURI,
    default: false,
    localService: true,
  } as SpeechSynthesisVoice;
}
