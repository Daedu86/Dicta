import { useCallback } from 'react';
import { loadAdaptiveBenchmarks, loadAdaptiveSessionFeedback } from './adaptiveStorage';
import { getDictaLocalStorageSnapshot } from './dictaLocalStorageSnapshot';
import {
  loadOllamaDefaultModel,
  loadOpenRouterDefaultModel,
} from './modelPreferenceStorage';
import { loadSessions } from './sessionStorage';
import { loadPersistedDictaLanguageView } from './uiPreferenceStorage';
import { SESSION_STORAGE_KEY } from './useSessionPersistenceSync';

type DictaLocalStorageImportRuntimeOptions = {
  setSessions: (sessions: ReturnType<typeof loadSessions>) => void;
  setActiveSessionId: (sessionId: string) => void;
  clearDashboardSession: () => void;
  setAdaptiveBenchmarksByInputLanguage: (benchmarks: ReturnType<typeof loadAdaptiveBenchmarks>) => void;
  setAdaptiveSessionFeedbackByInputLanguage: (feedback: ReturnType<typeof loadAdaptiveSessionFeedback>) => void;
  setDictaLanguageView: (languageView: ReturnType<typeof loadPersistedDictaLanguageView>) => void;
  setOpenRouterDefaultModel: (model: string) => void;
  setOllamaDefaultModel: (model: string) => void;
  showLeaderboardWorkspace: () => void;
  setExportMessage: (message: string) => void;
};

export function useDictaLocalStorageImportRuntime({
  setSessions,
  setActiveSessionId,
  clearDashboardSession,
  setAdaptiveBenchmarksByInputLanguage,
  setAdaptiveSessionFeedbackByInputLanguage,
  setDictaLanguageView,
  setOpenRouterDefaultModel,
  setOllamaDefaultModel,
  showLeaderboardWorkspace,
  setExportMessage,
}: DictaLocalStorageImportRuntimeOptions) {
  const importDictaLocalStorageSnapshot = useCallback((rawJson: string): void => {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Import file must be a JSON object exported from Dicta Admin.');
      }

      const incoming = Object.entries(parsed).filter(
        (entry): entry is [string, string] => entry[0].startsWith('dicta.') && typeof entry[1] === 'string',
      );
      if (incoming.length === 0) {
        throw new Error('No Dicta localStorage keys found in this file.');
      }

      const sessionEntry = incoming.find(([key]) => key === SESSION_STORAGE_KEY);
      if (sessionEntry) {
        const parsedSessions = JSON.parse(sessionEntry[1]) as unknown;
        if (!Array.isArray(parsedSessions)) {
          throw new Error('Imported sessions are not in the expected format.');
        }
      }

      const confirmed = window.confirm(
        'Import this Dicta storage snapshot into this browser? This replaces the current Vercel browser sessions, leaderboard, benchmarks, and feedback.',
      );
      if (!confirmed) return;

      for (const key of Object.keys(getDictaLocalStorageSnapshot())) {
        window.localStorage.removeItem(key);
      }
      for (const [key, value] of incoming) {
        window.localStorage.setItem(key, value);
      }

      const importedSessions = loadSessions();
      setSessions(importedSessions);
      setActiveSessionId(importedSessions[0]?.id ?? '');
      clearDashboardSession();
      setAdaptiveBenchmarksByInputLanguage(loadAdaptiveBenchmarks());
      setAdaptiveSessionFeedbackByInputLanguage(loadAdaptiveSessionFeedback());
      setDictaLanguageView(loadPersistedDictaLanguageView());

      setOpenRouterDefaultModel(loadOpenRouterDefaultModel());
      setOllamaDefaultModel(loadOllamaDefaultModel());

      showLeaderboardWorkspace();
      setExportMessage(`Imported ${incoming.length} Dicta storage key(s). Leaderboard and adaptive profiles restored in this browser.`);
    } catch (error) {
      setExportMessage(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed.');
    }
  }, [
    clearDashboardSession,
    setActiveSessionId,
    setAdaptiveBenchmarksByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    setDictaLanguageView,
    setExportMessage,
    setOllamaDefaultModel,
    setOpenRouterDefaultModel,
    setSessions,
    showLeaderboardWorkspace,
  ]);

  return { importDictaLocalStorageSnapshot };
}
