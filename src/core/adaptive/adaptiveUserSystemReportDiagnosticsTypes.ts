import type { AdaptiveWeakArea } from './types';

export type AdaptiveReportCount = {
  name: string;
  count: number;
};

export type AdaptiveReportStage = {
  role: string;
  status: string;
  evidence: string[];
};

export type AdaptiveUserSystemReportLoopBreakdown = {
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

export type AdaptiveUserSystemReportComponentDiagnostics = {
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
    modeDistributionAcceptedForBenchmark: AdaptiveReportCount[];
    modeDistributionAcceptedForSessionInsight: AdaptiveReportCount[];
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
