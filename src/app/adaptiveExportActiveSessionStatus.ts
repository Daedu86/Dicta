import type { InputLanguageBenchmarkMetrics } from '../core/adaptive/types';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { mapSessionInputMode, resolveStoredSessionLanguage } from './appRuntimeHelpers';
import type { SessionStatus, StoredSession, TypingLanguage } from './sessionTypes';

export type AdaptiveBenchmarkActiveSessionStatusInput = {
  activeSession: StoredSession | null;
  activeSessionFinished: boolean;
  sessionStatus: SessionStatus;
  getActiveTypingLanguage: () => TypingLanguage | null;
  profile: InputLanguageBenchmarkMetrics;
};

export function getAdaptiveBenchmarkActiveSessionStatus({
  activeSession,
  activeSessionFinished,
  sessionStatus,
  getActiveTypingLanguage,
  profile,
}: AdaptiveBenchmarkActiveSessionStatusInput): string | undefined {
  if (!activeSession || activeSessionFinished) return undefined;
  const activeInputMode = mapSessionInputMode(activeSession.inputMode);
  const activeLanguage = normalizeBenchmarkLanguage(getActiveTypingLanguage() ?? resolveStoredSessionLanguage(activeSession));
  if (profile.inputMode !== activeInputMode || profile.language !== activeLanguage) return undefined;
  return sessionStatus;
}
