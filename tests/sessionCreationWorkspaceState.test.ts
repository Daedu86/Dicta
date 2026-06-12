import { describe, expect, it, vi } from 'vitest';
import { createSessionCreationWorkspaceActions } from '../src/app/useSessionCreationWorkspaceState';
import type { DictationScriptValidationResult } from '../src/core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../src/core/sessionInputModes';
import type { SessionSource } from '../src/app/sessionTypes';

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

function createActionSetters() {
  return {
    setSessionCreationMode: vi.fn<StateSetter<SessionInputMode | null>>(),
    setSessionCreationSource: vi.fn<StateSetter<SessionSource>>(),
    setDictationScriptJson: vi.fn<StateSetter<string>>(),
    setDictationScriptValidation: vi.fn<StateSetter<DictationScriptValidationResult | null>>(),
  };
}

describe('createSessionCreationWorkspaceActions', () => {
  it('changes the session creation source and clears dictation script validation', () => {
    const setters = createActionSetters();
    const actions = createSessionCreationWorkspaceActions(setters);

    actions.changeSessionCreationSource('dictationScript');

    expect(setters.setSessionCreationSource).toHaveBeenCalledWith('dictationScript');
    expect(setters.setDictationScriptValidation).toHaveBeenCalledWith(null);
  });

  it('changes the dictation script JSON and clears dictation script validation', () => {
    const setters = createActionSetters();
    const actions = createSessionCreationWorkspaceActions(setters);

    actions.changeDictationScriptJson('{"title":"Demo"}');

    expect(setters.setDictationScriptJson).toHaveBeenCalledWith('{"title":"Demo"}');
    expect(setters.setDictationScriptValidation).toHaveBeenCalledWith(null);
  });

  it('cancels the session creation dialog without touching dictation script validation', () => {
    const setters = createActionSetters();
    const actions = createSessionCreationWorkspaceActions(setters);

    actions.cancelSessionCreation();

    expect(setters.setSessionCreationMode).toHaveBeenCalledWith(null);
    expect(setters.setDictationScriptValidation).not.toHaveBeenCalled();
  });
});
