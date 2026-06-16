import { useRef, useState } from 'react';
import { useAppPerfDiagnosticsRuntime } from './useAppPerfDiagnosticsRuntime';
import { useBrowserTtsRuntime } from './useBrowserTtsRuntime';
import { useThemeModeRuntime } from './useThemeModeRuntime';
import { useTrainingRuntimeState } from './useTrainingRuntimeState';
import { useWorkspaceRouting } from './useWorkspaceRouting';
import { loadSessions } from './sessionStorage';
import type { StoredSession } from './sessionTypes';

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
