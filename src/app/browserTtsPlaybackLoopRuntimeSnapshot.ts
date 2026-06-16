import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { evaluateTranscriptAttempt } from '../core/evaluation';
import { resolveBrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import { summarizeBrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';
import { collectBrowserTtsNavigatorInfo } from './browserTtsPlaybackLoopNavigator';

type BrowserTtsRuntimeSnapshotArgs = Pick<
  BrowserTtsPlaybackLoopOptions,
  | 'ttsLanguage'
  | 'ttsTranscript'
  | 'ttsLiveSignalRef'
  | 'ttsPracticeLiveTextRef'
  | 'getHistoricalPerformanceProfile'
  | 'getBenchmarkSnapshot'
>;

export function buildBrowserTtsPlaybackRuntimeSnapshot({
  ttsLanguage,
  ttsTranscript,
  ttsLiveSignalRef,
  ttsPracticeLiveTextRef,
  getHistoricalPerformanceProfile,
  getBenchmarkSnapshot,
}: BrowserTtsRuntimeSnapshotArgs) {
  const historyProfile = getHistoricalPerformanceProfile('browser-tts', ttsLanguage);
  const liveSignal = ttsLiveSignalRef.current;
  const livePracticeEvaluation = evaluateTranscriptAttempt(ttsPracticeLiveTextRef.current, ttsTranscript);
  const browserTtsProfile = resolveBrowserTtsAdaptiveProfile(ttsLanguage);
  const browserTtsBenchmark = getBenchmarkSnapshot('browser-tts', normalizeBenchmarkLanguage(ttsLanguage));
  const navigatorInfo = collectBrowserTtsNavigatorInfo();
  const browserTtsRecovery = summarizeBrowserTtsDeRecoveryState({
    timeline: browserTtsBenchmark.timeline,
    ...navigatorInfo,
  });

  return {
    historyProfile,
    liveSignal,
    livePracticeEvaluation,
    browserTtsProfile,
    browserTtsBenchmark,
    navigatorInfo,
    browserTtsRecovery,
  };
}
