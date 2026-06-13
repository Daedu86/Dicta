import type { LiveTelemetryFrame } from '../core/adaptive/types';
import { clamp01 } from './appRuntimeHelpers';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

export type BrowserTtsPhraseCompletionTelemetryInput = {
  chunkTelemetry: LiveTelemetryFrame;
  semanticPhraseId?: string;
  macroPhraseIndex: number;
  liveSignal: TtsLiveSignal;
  unsafeChunkCount: number;
};

export function buildBrowserTtsPhraseCompletionTelemetry({
  chunkTelemetry,
  semanticPhraseId,
  macroPhraseIndex,
  liveSignal,
  unsafeChunkCount,
}: BrowserTtsPhraseCompletionTelemetryInput): LiveTelemetryFrame {
  const completionAccuracy = clamp01(liveSignal.accuracy / 100);

  return {
    ...chunkTelemetry,
    phraseId: semanticPhraseId ?? `phrase-${macroPhraseIndex}`,
    accuracy: completionAccuracy,
    errorRate: clamp01(1 - completionAccuracy),
    wpm: liveSignal.wpm,
    lagSec: liveSignal.lagSec,
    rawLagSec: liveSignal.rawLagSec,
    stableLagSec: liveSignal.stableLagSec,
    lagOutlierCount: liveSignal.lagOutlierCount,
    unsafeChunkCount,
    trend: liveSignal.trend,
  };
}
