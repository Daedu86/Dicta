import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputCapabilities,
  LiveTelemetryFrame,
} from '../../src/core/adaptive/types';

export const baseHistory: HistoricalPerformanceProfile = {
  language: 'en',
  inputMode: 'browser-tts',
  comfortablePlaybackRate: 1,
  averageWpm: 50,
  averageAccuracy: 0.9,
  averageLagSec: 0,
  averagePauseMs: 700,
  preferredPhraseSize: 'medium',
  preferredPauseAfterPhraseMs: 700,
  typicalBackspaceRate: 0.03,
  typicalCorrectionRate: 0.04,
  strugglesWithLongPhrases: false,
  strugglesWithNumbers: false,
  strugglesWithNames: false,
  strugglesWithPunctuation: false,
  improvementTrend: 'stable',
  sessionsCount: 6,
  profileConfidence: 0.8,
};

export const browserTtsCapabilities: InputCapabilities = {
  supportsClausePause: true,
  supportsSentencePause: true,
  supportsPhraseReplay: false,
  supportsMidPhraseReplay: false,
  supportsDynamicRateChange: true,
  requiresPreChunking: true,
};

export function live(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'phrase-1',
    spokenProgressRatio: 0.5,
    typedProgressRatio: 0.5,
    lagSec: 0.2,
    lagWords: 0,
    lagChars: 0,
    accuracy: 0.94,
    errorRate: 0.06,
    wpm: 52,
    charsPerMinute: 260,
    pauseMs: 500,
    longestPauseMs: 800,
    backspaceRate: 0.03,
    correctionRate: 0.03,
    phraseDifficulty: 0.35,
    phraseLengthWords: 7,
    phraseLengthChars: 42,
    language: 'en',
    phraseBoundaryType: 'sentence',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 1,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    trend: 'stable',
    ...overrides,
  };
}

export function input(
  overrides: Partial<LiveTelemetryFrame> = {},
  historyOverrides: Partial<HistoricalPerformanceProfile> = {},
): AdaptivePacingInput {
  return {
    live: live(overrides),
    history: {
      ...baseHistory,
      ...historyOverrides,
    },
    capabilities: browserTtsCapabilities,
  };
}
