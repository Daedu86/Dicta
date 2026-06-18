import type { SessionPointsSource } from '../evaluation';
import type { BrowserTtsEnvironmentFingerprint, BrowserTtsEnvironmentHistoryEntry } from '../../types/dictation';
import type { AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';
import type { ListeningCycleInsightReportV3 } from './listeningCycleInsightReportV3';
import type {
  AdaptiveUserSystemReportComponentDiagnostics,
  AdaptiveUserSystemReportLoopBreakdown,
} from './adaptiveUserSystemReportDiagnosticsTypes';

export type {
  AdaptiveReportCount,
  AdaptiveReportStage,
  AdaptiveUserSystemReportComponentDiagnostics,
  AdaptiveUserSystemReportLoopBreakdown,
} from './adaptiveUserSystemReportDiagnosticsTypes';

export type AdaptiveReportSessionMetrics = {
  score: number;
  points: number;
  accuracy: number;
  wpm: number;
  lagSec: number;
  rate?: number;
  trend?: 'improving' | 'stable' | 'declining' | string;
};

export type AdaptiveReportSession = SessionPointsSource & {
  id: string;
  name: string;
  status?: string;
  difficulty?: string;
  inputModeLabel?: string;
  language?: string;
  updatedAt?: string;
  createdAt?: string;
  durationLabel?: string;
  metrics: AdaptiveReportSessionMetrics;
  telemetry?: {
    repeatCount?: number;
    finishedAt?: string | null;
  };
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  dictationScript?: {
    title?: string;
    difficulty?: string;
    estimatedDurationSec?: number;
    phrases?: unknown[];
  } | null;
};

export type AdaptiveUserSystemReportSessionSummary = {
  id: string;
  name: string;
  status?: string;
  difficulty: string | null;
  inputMode: string | null;
  language: string | null;
  score: number;
  points: string;
  accuracy: string;
  wpm: string;
  lag: string;
  duration: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
  trend: string | null;
  repeatCount: number | null;
};

export type AdaptiveUserSystemReport = {
  reportMetadata: {
    schemaVersion: 3;
    generatedAt: string;
    reportType: 'adaptive_user_system_report';
    inputMode: InputLanguageBenchmarkMetrics['inputMode'];
    inputModeLabel: string;
    language: string;
    languageLabel: string;
    intendedUse: string;
    reportLayers: string[];
    rawDebugDataPolicy: string;
    estimatedTechnicalDebugDataBytes: number | null;
    ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
    ttsEnvironmentHistory?: BrowserTtsEnvironmentHistoryEntry[];
    environmentChanged?: boolean;
  };
  executiveSummary: {
    status: 'needs_more_data' | 'recovery_recommended' | 'stable' | 'challenge_ready';
    headline: string;
    primaryFinding: string;
    nextBestAction: string;
    reportReadingOrder: string[];
  };
  adaptiveLoopBreakdown: AdaptiveUserSystemReportLoopBreakdown;
  componentDiagnostics: AdaptiveUserSystemReportComponentDiagnostics;
  listeningCycleV3: {
    status: 'available' | 'no_frames';
    primaryConstraint: ListeningCycleInsightReportV3['primaryConstraint'];
    confidence: number;
    axes: ListeningCycleInsightReportV3['axes'];
    evidence: ListeningCycleInsightReportV3['evidence'];
    reasonCodes: string[];
    nextSessionKnobs: ListeningCycleInsightReportV3['nextSessionKnobs'];
    summaryBullets: string[];
    contradictionNotes: string[];
    accessibilityNote: string;
  };
  compactTechnicalDebugSummary: {
    estimatedTechnicalDebugDataBytes: number | null;
    rawDebugIncluded: true;
    rawDebugLocation: 'technicalDebugData';
    debugTopLevelKeys: string[];
    recentTimelinePointCount: number | null;
    note: string;
  };
  userProgressSummary: {
    status: 'available' | 'no_finished_session';
    howYouDid: string;
    latestSession: null | AdaptiveUserSystemReportSessionSummary;
    positiveSignals: string[];
    needsImprovement: string[];
    nextPracticeFocus: string[];
    recommendedNextExercise: {
      difficulty: 'easy' | 'normal' | 'hard';
      why: string;
      focus: string[];
      contentGuidance: string[];
      pacingGuidance: string[];
    };
  };
  adaptiveSystemSummary: {
    benchmarkHealth: {
      sessionCount: number;
      sampleCount: number;
      confidence: number;
      weakAreas: AdaptiveWeakArea[];
      recommendationSummary: string;
    };
    whatIsWorking: string[];
    whatNeedsTuning: string[];
    recommendedSystemAdjustments: {
      playbackRate: string;
      pauseAfterPhraseMs: string;
      phraseLength: string;
      difficulty: string;
      replayBoundaries: string;
    };
    feedbackStatus: string;
  };
  technicalDebugData: unknown;
};
