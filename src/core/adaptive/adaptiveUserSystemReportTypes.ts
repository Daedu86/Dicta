import type { SessionPointsSource } from '../evaluation';
import type { BrowserTtsEnvironmentFingerprint, BrowserTtsEnvironmentHistoryEntry } from '../../types/dictation';
import type { AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';

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

type AdaptiveReportCount = {
  name: string;
  count: number;
};

type AdaptiveReportStage = {
  role: string;
  status: string;
  evidence: string[];
};

export type AdaptiveUserSystemReport = {
  reportMetadata: {
    schemaVersion: 2;
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
  adaptiveLoopBreakdown: {
    sourceOfTruth: {
      benchmark: string;
      feedback: string;
      insightReport: string;
    };
    generation: AdaptiveReportStage & {
      promptMode: 'compact-adaptive-v2';
      complianceAuditStatus: 'not_recorded_in_this_report_yet';
    };
    plannerAndChunking: AdaptiveReportStage;
    controllerBrain: AdaptiveReportStage;
    runtimeExecution: AdaptiveReportStage;
    learningLoop: AdaptiveReportStage;
  };
  componentDiagnostics: {
    generationAndPrescription: {
      promptMode: 'compact-adaptive-v2';
      llmRole: string;
      targetDifficulty: 'easy' | 'normal' | 'hard';
      targetRateRange: [number, number];
      targetPhraseSize: string;
      targetPauseMs: number;
      nextTrainingFocus: string[];
      complianceAudit: {
        status: 'not_recorded_in_this_report_yet';
        recommendation: string;
      };
    };
    plannerAndChunking: {
      role: string;
      targetPhraseSize: string;
      targetPauseMs: number;
      targetRateRange: [number, number];
      averageSemanticCompleteness: number;
      averagePhraseDifficulty: number;
      semanticCutPenalty: number;
      safePauseCount: number;
      unsafePauseCount: number;
      deferredPauseCount: number;
      replayDeniedByBoundaryCount: number;
      boundaryDistribution: AdaptiveReportCount[];
      recentTimelineSampleCount: number;
      notes: string[];
    };
    controllerAndPacing: {
      role: string;
      controlFidelityScore: number;
      flowStabilityScore: number;
      inputExecutionFidelityScore: number;
      preferredPlaybackRate: number;
      preferredPhraseSize: string;
      preferredPauseAfterPhraseMs: number;
      modeSwitchFrequency: number;
      rateVariance: number;
      pauseVariance: number;
      modeDistribution: AdaptiveReportCount[];
      eventDistribution: AdaptiveReportCount[];
      topDecisionReasons: AdaptiveReportCount[];
      expectedControllerBehavior: string[];
    };
    browserTtsEnvironment: {
      status: 'not_browser_tts' | 'available' | 'missing';
      selectedVoice: null | {
        engine: string;
        voiceName: string | null;
        voiceLang: string | null;
        voiceURI: string | null;
        localService: boolean | null;
      };
      availableVoicesSummary: null | {
        availableVoiceCount: number;
        matchingVoiceCount: number;
      };
      platformSummary: null | {
        platform: string;
        standalonePwa: boolean;
        browserUserAgentHash: string;
      };
      environmentChanged: boolean;
      historyCount: number;
      diagnostics: Record<string, unknown> | null;
      notes: string[];
    };
    benchmarkAndFeedback: {
      sessionCount: number;
      sampleCount: number;
      lastUpdatedAt: string | null;
      confidence: number;
      weakAreas: AdaptiveWeakArea[];
      recommendationSummary: string;
      sessionFeedbackStatus: string;
      feedbackCreatedAt: string | null;
      feedbackCompletedAt: string | null;
      listeningPrecisionAverages: unknown;
      latestFeedbackVerdict: string | null;
    };
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
    latestSession: null | {
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
