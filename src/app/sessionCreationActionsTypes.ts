import type { MutableRefObject } from 'react';
import type {
  DictationScriptValidationResult,
} from '../core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../core/sessionInputModes';
import type {
  GenerationOrigin,
  SessionSource,
  StoredSession,
  TtsLanguage,
} from './sessionTypes';

export type SessionCreationMessageTarget = 'error' | 'openrouter' | 'export';

export type OpenRouterScriptCreationOptions = {
  navigateToLeaderboard?: boolean;
  generationOrigin?: GenerationOrigin;
};

export type UseSessionCreationActionsOptions = {
  sessionCreationName: string;
  dictationScriptJson: string;
  dictationScriptValidation: DictationScriptValidationResult | null;
  browserTtsVoices: readonly SpeechSynthesisVoice[];
  suppressSidebarAutoSelectRef: MutableRefObject<boolean>;
  ensureCanCreateDictationSession: (messageTarget: SessionCreationMessageTarget) => boolean;
  prependSessionAndPersistNow: (createNextSession: (previousSessions: StoredSession[]) => StoredSession) => StoredSession;
  showSessionInputWorkspace: (inputMode: SessionInputMode) => void;
  showLeaderboardWorkspace: () => void;
  setActiveSessionId: (sessionId: string) => void;
  setLeaderboardLanguageView: (language: TtsLanguage) => void;
  setSessionCreationMode: (mode: SessionInputMode | null) => void;
  setSessionCreationSource: (source: SessionSource) => void;
  setSessionCreationName: (name: string) => void;
  setDictationScriptJson: (json: string) => void;
  setDictationScriptValidation: (validation: DictationScriptValidationResult | null) => void;
  setError: (message: string) => void;
  setOpenRouterError: (message: string) => void;
  setExportMessage: (message: string) => void;
};

export type SessionCreationFormResetActionOptions = Pick<
  UseSessionCreationActionsOptions,
  | 'setSessionCreationMode'
  | 'setSessionCreationSource'
  | 'setSessionCreationName'
  | 'setDictationScriptJson'
  | 'setDictationScriptValidation'
>;
