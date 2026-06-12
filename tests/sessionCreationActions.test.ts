import { describe, expect, it, vi } from 'vitest';
import { createSessionCreationFormResetAction } from '../src/app/useSessionCreationActions';
import type { DictationScriptValidationResult } from '../src/core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../src/core/sessionInputModes';
import type { SessionSource } from '../src/app/sessionTypes';

type StateSetter<T> = (value: T) => void;

function createResetActionSetters() {
  return {
    setSessionCreationMode: vi.fn<StateSetter<SessionInputMode | null>>(),
    setSessionCreationSource: vi.fn<StateSetter<SessionSource>>(),
    setSessionCreationName: vi.fn<StateSetter<string>>(),
    setDictationScriptJson: vi.fn<StateSetter<string>>(),
    setDictationScriptValidation: vi.fn<StateSetter<DictationScriptValidationResult | null>>(),
    setTtsExpanded: vi.fn<StateSetter<boolean>>(),
  };
}

describe('createSessionCreationFormResetAction', () => {
  it('resets the session creation form and expands TTS setup for plain text sessions', () => {
    const setters = createResetActionSetters();
    const resetSessionCreationForm = createSessionCreationFormResetAction(setters);

    resetSessionCreationForm(true);

    expect(setters.setSessionCreationMode).toHaveBeenCalledWith(null);
    expect(setters.setSessionCreationSource).toHaveBeenCalledWith('plainText');
    expect(setters.setSessionCreationName).toHaveBeenCalledWith('');
    expect(setters.setDictationScriptJson).toHaveBeenCalledWith('');
    expect(setters.setDictationScriptValidation).toHaveBeenCalledWith(null);
    expect(setters.setTtsExpanded).toHaveBeenCalledWith(true);
  });

  it('resets the session creation form and collapses TTS setup for script-created sessions', () => {
    const setters = createResetActionSetters();
    const resetSessionCreationForm = createSessionCreationFormResetAction(setters);

    resetSessionCreationForm(false);

    expect(setters.setSessionCreationMode).toHaveBeenCalledWith(null);
    expect(setters.setSessionCreationSource).toHaveBeenCalledWith('plainText');
    expect(setters.setSessionCreationName).toHaveBeenCalledWith('');
    expect(setters.setDictationScriptJson).toHaveBeenCalledWith('');
    expect(setters.setDictationScriptValidation).toHaveBeenCalledWith(null);
    expect(setters.setTtsExpanded).toHaveBeenCalledWith(false);
  });
});
