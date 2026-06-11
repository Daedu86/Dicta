import { useState } from 'react';
import type { DictationScriptValidationResult } from '../core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../core/sessionInputModes';
import type { SessionSource } from './sessionTypes';

export function useSessionCreationWorkspaceState() {
  const [openRouterGenerateFocusRequest, setOpenRouterGenerateFocusRequest] = useState(0);
  const [sessionCreationMode, setSessionCreationMode] = useState<SessionInputMode | null>(null);
  const [sessionCreationSource, setSessionCreationSource] = useState<SessionSource>('plainText');
  const [sessionCreationName, setSessionCreationName] = useState('');
  const [dictationScriptJson, setDictationScriptJson] = useState('');
  const [dictationScriptValidation, setDictationScriptValidation] =
    useState<DictationScriptValidationResult | null>(null);

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
  };
}
