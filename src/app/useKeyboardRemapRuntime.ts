import { useCallback, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import {
  BROWSER_TTS_SESSION_INPUT_MODE,
  type SessionInputMode,
} from '../core/sessionInputModes';
import type { TypingLanguage } from './sessionTypes';

type KeyboardProfile = null | 'es-virtual' | 'de-keyboard';

type KeyboardRemapRuntimeOptions = {
  activeInputMode: SessionInputMode | null;
  inputSettingsLocked: boolean;
  ttsLanguage: TypingLanguage;
};

export function useKeyboardRemapRuntime({
  activeInputMode,
  inputSettingsLocked,
  ttsLanguage,
}: KeyboardRemapRuntimeOptions) {
  const getActiveTypingLanguage = useCallback((): TypingLanguage | null => {
    return activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE ? ttsLanguage : null;
  }, [activeInputMode, ttsLanguage]);

  const keyboardProfile = useMemo<KeyboardProfile>(() => {
    if (!inputSettingsLocked) {
      return null;
    }
    const language = getActiveTypingLanguage();
    if (language === 'es') {
      return 'es-virtual';
    }
    if (language === 'en' || language === 'de' || language === 'fr' || language === 'pt') {
      return 'de-keyboard';
    }
    return null;
  }, [getActiveTypingLanguage, inputSettingsLocked]);

  const normalizePhysicalKey = useCallback((
    event: KeyboardEvent<HTMLTextAreaElement>,
    language: TypingLanguage | null,
  ): string | null => {
    if (language !== 'es') {
      return null;
    }
    if (event.code === 'KeyY') {
      return event.shiftKey ? 'Z' : 'z';
    }
    if (event.code === 'KeyZ') {
      return event.shiftKey ? 'Y' : 'y';
    }
    return null;
  }, []);

  const handleEsKeyboardRemapKeyDown = useCallback((
    event: KeyboardEvent<HTMLTextAreaElement>,
    applyValue: (value: string) => void,
  ): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) {
      return;
    }
    if (keyboardProfile !== 'es-virtual') {
      return;
    }
    const mappedChar = normalizePhysicalKey(event, getActiveTypingLanguage());
    if (!mappedChar) {
      return;
    }
    event.preventDefault();
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    textarea.setRangeText(mappedChar, selectionStart, selectionEnd, 'end');
    applyValue(textarea.value);
  }, [getActiveTypingLanguage, keyboardProfile, normalizePhysicalKey]);

  return {
    getActiveTypingLanguage,
    handleEsKeyboardRemapKeyDown,
  };
}
