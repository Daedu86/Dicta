import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  InputMode,
} from '../core/adaptive/types';
import type { MetricsLanguageView } from '../core/liveMetrics';
import type { SessionStatus, StoredSession, TypingLanguage } from './sessionTypes';

export type UseAdaptiveExportActionsOptions = {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  activeSessionFinished: boolean;
  sessionStatus: SessionStatus;
  getActiveTypingLanguage: () => TypingLanguage | null;
  insightsDiagnosticProfile: InputLanguageBenchmarkMetrics;
  insightsDiagnosticFeedback: AdaptiveSessionFeedback | null;
  insightsDiagnosticInputMode: InputMode;
  metricsLanguageView: MetricsLanguageView;
  setBenchmarkExportMessage: (message: string) => void;
  setExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
  setInsightsDiagnosticFallbackReport: (report: string) => void;
  setInsightsDiagnosticMessage: (message: string) => void;
};
