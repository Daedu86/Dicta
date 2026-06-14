import { useMemo } from 'react';
import {
  configForDifficulty,
  type Difficulty,
} from '../core/config';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { buildTtsPlaybackProfile } from './ttsPlaybackProfile';
import type {
  SessionStatus,
  StoredSession,
} from './sessionTypes';
import type { WorkspaceMode } from './useWorkspaceRouting';

type UseActiveSessionDerivedRuntimeArgs = {
  sessions: StoredSession[];
  activeSessionId: string | null;
  dashboardSessionId: string | null;
  difficulty: Difficulty;
  sessionStatus: SessionStatus;
};

export function useActiveSessionDerivedRuntime({
  sessions,
  activeSessionId,
  dashboardSessionId,
  difficulty,
  sessionStatus,
}: UseActiveSessionDerivedRuntimeArgs) {
  const config = useMemo(() => configForDifficulty(difficulty), [difficulty]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const dashboardSession = useMemo(
    () => sessions.find((session) => session.id === dashboardSessionId) ?? activeSession,
    [activeSession, dashboardSessionId, sessions],
  );

  const activeInputMode = activeSession?.inputMode ?? BROWSER_TTS_SESSION_INPUT_MODE;
  const activeInputLabel =
    activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE
      ? 'Input # 2 - Text to Speech (TTS)'
      : 'Browser TTS';
  const activeInputWorkspaceMode: WorkspaceMode = 'tts';
  const activeSessionFinished = sessionStatus === 'finished' || activeSession?.status === 'finished';

  const ttsPlaybackProfile = useMemo(
    () => buildTtsPlaybackProfile(sessions, activeSession),
    [sessions, activeSession],
  );

  return {
    config,
    activeSession,
    dashboardSession,
    activeInputMode,
    activeInputLabel,
    activeInputWorkspaceMode,
    activeSessionFinished,
    ttsPlaybackProfile,
  };
}
