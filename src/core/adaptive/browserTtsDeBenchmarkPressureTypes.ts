export type BrowserTtsDeTimelinePressure = {
  validScoringSampleCount: number;
  sessionInsightSampleCount: number;
  sessionInsightFallbackSampleCount: number;
  supportRatio: number;
  unsafeBoundaryRatio: number;
  severeRawLagOutlierCount: number;
  severeRecoveryRatio: number;
  unsafeChunkRatio: number;
  highLagRatio: number;
  lowAccuracyRatio: number;
  technicalTimingIssueCount: number;
  hasRecentCleanCompletedSamples: boolean;
  hasRecentCleanSessionInsightSamples: boolean;
  hasLearnerRecoveryPressure: boolean;
  shouldUseConservativeRecommendation: boolean;
};
