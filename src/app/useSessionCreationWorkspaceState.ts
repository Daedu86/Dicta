import { useMemo, useState } from 'react';
import type { DictationScriptValidationResult } from '../core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../core/sessionInputModes';
import type { SessionSource } from './sessionTypes';

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

type SessionCreationWorkspaceActionSetters = {
  setSessionCreationMode: StateSetter<SessionInputMode | null>;
  setSessionCreationSource: StateSetter<SessionSource>;
  setDictationScriptJson: StateSetter<string>;
  setDictationScriptValidation: StateSetter<DictationScriptValidationResult | null>;
};

export function createSessionCreationWorkspaceActions({
  setSessionCreationMode,
  setSessionCreationSource,
  setDictationScriptJson,
  setDictationScriptValidation,
}: SessionCreationWorkspaceActionSetters) {
  return {
    changeSessionCreationSource(value: SessionSource): void {
      setSessionCreationSource(value);
      setDictationScriptValidation(null);
    },
    changeDictationScriptJson(value: string): void {
      setDictationScriptJson(value);
      setDictationScriptValidation(null);
    },
    cancelSessionCreation(): void {
      setSessionCreationMode(null);
    },
  };
}

export function useSessionCreationWorkspaceState() {
  const [openRouterGenerateFocusRequest, setOpenRouterGenerateFocusRequest] = useState(0);
  const [sessionCreationMode, setSessionCreationMode] = useState<SessionInputMode | null>(null);
  const [sessionCreationSource, setSessionCreationSource] = useState<SessionSource>('plainText');
  const [sessionCreationName, setSessionCreationName] = useState('');
  const [dictationScriptJson, setDictationScriptJson] = useState('');
  const [dictationScriptValidation, setDictationScriptValidation] =
    useState<DictationScriptValidationResult | null>(null);
  const sessionCreationActions = useMemo(
    () =>
      createSessionCreationWorkspaceActions({
        setSessionCreationMode,
        setSessionCreationSource,
        setDictationScriptJson,
        setDictationScriptValidation,
      }),
    [setSessionCreationMode, setSessionCreationSource, setDictationScriptJson, setDictationScriptValidation],
  );

  return {
    openRouterGenerateFocusRequest,
    setOpenRouterGenerateFocusRequest,
    sessionCreationMode,
    setSessionCreationMode,
    sessionCreationSource,
    setSessionCreationSource,
    sessionCreationName,
    setSessionCreationName,
    dictationScriptJson,
    setDictationScriptJson,
    dictationScriptValidation,
    setDictationScriptValidation,
    ...sessionCreationActions,
  };
}
