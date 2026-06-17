export type PhraseSize = 'short' | 'medium' | 'long';
export type PacingMode = 'recovery' | 'support' | 'balanced' | 'flow';
export type PacingReasonCode =
  | 'mode-recovery'
  | 'mode-support'
  | 'mode-balanced'
  | 'mode-flow'
  | 'session-warmup-calibration'
  | 'phrase-overload'
  | 'long-phrase-sensitive'
  | 'replay-due-to-lag-or-error'
  | 'replay-disabled-recovery'
  | 'replay-blocked-boundary'
  | 'replay-blocked-incomplete-phrase'
  | 'defer-pause-until-safe-boundary'
  | 'high-accuracy-low-lag'
  | 'support-needed'
  | 'recovery-needed'
  | 'extended-catch-up-window'
  | 'flow-blocked-after-recovery'
  | 'stable-recovery-confirmed'
  | 'low-history-confidence'
  | 'adaptive-playback-comfort-profile'
  | 'adaptive-pause-very-low-accuracy'
  | 'adaptive-pause-low-accuracy'
  | 'adaptive-pause-severe-lag'
  | 'adaptive-pause-lag'
  | 'adaptive-pause-progress-gap'
  | 'adaptive-pause-history-pressure'
  | 'adaptive-pause-session-pressure'
  | 'listening-precision-rate-ceiling';
export type ImprovementTrend = 'improving' | 'stable' | 'declining';
export type PhraseBoundaryType = 'sentence' | 'clause' | 'minor' | 'unsafe';
export type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'unknown' | string;
