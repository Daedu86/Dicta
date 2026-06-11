// @vitest-environment jsdom
import { act, createElement } from 'react';
import type { KeyboardEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BROWSER_TTS_SESSION_INPUT_MODE,
  type SessionInputMode,
} from '../src/core/sessionInputModes';
import { useKeyboardRemapRuntime } from '../src/app/useKeyboardRemapRuntime';
import type { TypingLanguage } from '../src/app/sessionTypes';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type RuntimeSnapshot = ReturnType<typeof useKeyboardRemapRuntime>;

type RuntimeOptions = {
  activeInputMode: SessionInputMode | null;
  inputSettingsLocked: boolean;
  ttsLanguage: TypingLanguage;
};

let host: HTMLDivElement;
let root: Root;
let latestRuntime: RuntimeSnapshot | null;

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
});

describe('useKeyboardRemapRuntime', () => {
  it.each([
    ['KeyY', false, 'z'],
    ['KeyY', true, 'Z'],
    ['KeyZ', false, 'y'],
    ['KeyZ', true, 'Y'],
  ])('remaps %s with shift=%s for locked Spanish Browser TTS typing', (code, shiftKey, expected) => {
    renderRuntime({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      inputSettingsLocked: true,
      ttsLanguage: 'es',
    });
    const textarea = createTextarea('');
    const applyValue = vi.fn();
    const { event, preventDefault } = createKeyEvent({ code, shiftKey, textarea });

    latestRuntime?.handleEsKeyboardRemapKeyDown(event, applyValue);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe(expected);
    expect(applyValue).toHaveBeenCalledWith(expected);
  });

  it.each(['en', 'de', 'fr', 'pt'] as TypingLanguage[])('does not remap locked %s Browser TTS typing', (language) => {
    renderRuntime({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      inputSettingsLocked: true,
      ttsLanguage: language,
    });
    const textarea = createTextarea('abc');
    const applyValue = vi.fn();
    const { event, preventDefault } = createKeyEvent({ code: 'KeyY', textarea });

    latestRuntime?.handleEsKeyboardRemapKeyDown(event, applyValue);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(textarea.value).toBe('abc');
    expect(applyValue).not.toHaveBeenCalled();
  });

  it('does not remap Spanish typing until input settings are locked', () => {
    renderRuntime({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      inputSettingsLocked: false,
      ttsLanguage: 'es',
    });
    const textarea = createTextarea('abc');
    const applyValue = vi.fn();
    const { event, preventDefault } = createKeyEvent({ code: 'KeyY', textarea });

    latestRuntime?.handleEsKeyboardRemapKeyDown(event, applyValue);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(textarea.value).toBe('abc');
    expect(applyValue).not.toHaveBeenCalled();
  });

  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { isComposing: true },
  ])('does not intercept keyboard shortcuts or composing input: %o', (eventOptions) => {
    renderRuntime({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      inputSettingsLocked: true,
      ttsLanguage: 'es',
    });
    const textarea = createTextarea('abc');
    const applyValue = vi.fn();
    const { event, preventDefault } = createKeyEvent({
      code: 'KeyY',
      textarea,
      ...eventOptions,
    });

    latestRuntime?.handleEsKeyboardRemapKeyDown(event, applyValue);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(textarea.value).toBe('abc');
    expect(applyValue).not.toHaveBeenCalled();
  });
});

function renderRuntime(options: RuntimeOptions): void {
  function Harness() {
    latestRuntime = useKeyboardRemapRuntime(options);
    return null;
  }

  act(() => {
    root.render(createElement(Harness));
  });
}

function createTextarea(value: string): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.selectionStart = value.length;
  textarea.selectionEnd = value.length;
  return textarea;
}

function createKeyEvent({
  code,
  textarea,
  shiftKey = false,
  ctrlKey = false,
  metaKey = false,
  altKey = false,
  isComposing = false,
}: {
  code: string;
  textarea: HTMLTextAreaElement;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}): {
  event: KeyboardEvent<HTMLTextAreaElement>;
  preventDefault: ReturnType<typeof vi.fn>;
} {
  const preventDefault = vi.fn();
  const event = {
    code,
    shiftKey,
    ctrlKey,
    metaKey,
    altKey,
    nativeEvent: { isComposing },
    preventDefault,
    currentTarget: textarea,
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
  return { event, preventDefault };
}
