import { useEffect, useRef, useState } from 'react';
import { useAppPerfDiagnosticsRuntime } from './useAppPerfDiagnosticsRuntime';
import { useBrowserTtsRuntime } from './useBrowserTtsRuntime';
import { useThemeModeRuntime } from './useThemeModeRuntime';
import { useTrainingRuntimeState } from './useTrainingRuntimeState';
import { useWorkspaceRouting } from './useWorkspaceRouting';
import { loadSessions } from './sessionStorage';
import { createStoredSession } from './sessionFactory';
import type { StoredSession } from './sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';

export function useDictaAppBootRuntime() {
  const perfDiagnosticsEnabled = useAppPerfDiagnosticsRuntime();
  const [sessions, setSessions] = useState<StoredSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => loadSessions()[0]?.id ?? '');
  const trainingState = useTrainingRuntimeState();
  const routing = useWorkspaceRouting();
  const theme = useThemeModeRuntime();
  const browserTts = useBrowserTtsRuntime();
  const suppressSidebarAutoSelectRef = useRef(false);
  const hydratingSessionIdRef = useRef<string | null>(null);
  const allowFinishedSessionResetRef = useRef<string | null>(null);

  useEffect(() => {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1';
    if (!isLocalHost) return;
    if (sessions.length > 0) return;

    const now = new Date().toISOString();
    const demoSession = {
      ...createStoredSession(1, BROWSER_TTS_SESSION_INPUT_MODE, 'Local review demo'),
      id: 'local-review-demo-session',
      createdAt: now,
      updatedAt: now,
      inputSettingsLocked: true,
      ttsText: 'Der Bäcker öffnet früh morgens die Tür, und riecht frische Brötchen auf dem Markt.',
      ttsLanguage: 'de',
      ttsPracticeText: 'Der backer offnet fruh morgens die tur ind riecht grosche Brötchen aif dem mark',
      status: 'finished',
      metrics: {
        controllerState: 'hold',
        rate: 1,
        lagSec: 0,
        lagWords: 0,
        wpm: 0,
        accuracy: 80.8,
        trend: 'stable',
        score: 530,
        points: 147,
      },
    } satisfies StoredSession;

    setSessions([demoSession]);
    setActiveSessionId(demoSession.id);
    window.localStorage.setItem('dicta.sessions.v1', JSON.stringify([demoSession]));
  }, [sessions.length]);

  return {
    perfDiagnosticsEnabled,
    sessionsState: {
      sessions,
      setSessions,
      activeSessionId,
      setActiveSessionId,
    },
    trainingState,
    routing,
    theme,
    browserTts,
    refs: {
      suppressSidebarAutoSelectRef,
      hydratingSessionIdRef,
      allowFinishedSessionResetRef,
    },
  };
}
