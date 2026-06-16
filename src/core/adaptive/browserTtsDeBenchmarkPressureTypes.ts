export type BrowserTtsDeTimelinePressure = {
  validScoringSampleCount: number;
  supportRatio: number;
  unsafeBoundaryRatio: number;
  severeRawLagOutlierCount: number;
  severeRecoveryRatio: number;
  unsafeChunkRatio: number;
  highLagRatio: number;
  lowAccuracyRatio: number;
  technicalTimingIssueCount: number;
  hasRecentCleanCompletedSamples: boolean;
  hasLearnerRecoveryPressure: boolean;
  shouldUseConservativeRecommendation: boolean;
};
