import type { BrowserTtsPlaybackPlanInput } from '../../src/app/browserTtsPlaybackPlan';
import { resolveBrowserTtsAdaptiveProfile } from '../../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  attempt,
  benchmark,
  decision,
  historyProfile,
  liveSignal,
  recovery,
} from './browserTtsPlaybackPlanMetricFixtures';

export { chunk } from './browserTtsPlaybackPlanChunkFixtures';
export {
  attempt,
  benchmark,
  decision,
  historyProfile,
  liveSignal,
  recovery,
} from './browserTtsPlaybackPlanMetricFixtures';

export const desktopNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
};

export const androidNavigator = {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
};

export function input(overrides: Partial<BrowserTtsPlaybackPlanInput> = {}): BrowserTtsPlaybackPlanInput {
  const language = overrides.language ?? 'en';
  const macroWords = overrides.macroWords ?? 'We listen carefully, then we type the sentence.'.split(' ');

  const base: BrowserTtsPlaybackPlanInput = {
    macroWords,
    macroWordOffset: 0,
    macroStartWordIndex: 0,
    language,
    lastPhraseSize: 'medium',
    lastBoundaryStrictness: 'sentence',
    liveSignal: liveSignal(),
    livePracticeEvaluation: attempt(),
    browserTtsProfile: resolveBrowserTtsAdaptiveProfile(language),
    browserTtsBenchmark: benchmark(language),
    browserTtsRecovery: recovery(),
    ttsSpeechRate: 1,
    ttsPlaybackPauseMs: 260,
    adaptiveController: {
      decide: () => decision(),
    },
    historyProfile: historyProfile({ language }),
    sourceWordCount: macroWords.length,
    estimatedSpokenWordIndex: 0,
    chunkIndex: 0,
    unsafeChunkCount: 0,
    accuracyWindow: [],
    lastAccuracySnapshot: { typedWords: 0, matchedWords: 0 },
    navigatorInfo: desktopNavigator,
  };

  return {
    ...base,
    ...overrides,
  };
}
