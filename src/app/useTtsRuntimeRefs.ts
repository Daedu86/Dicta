import { useEffect, useRef } from 'react';
import type { ControlAction, SessionTelemetry } from '../types/dictation';
import type { TtsLiveSignal } from './ttsPlaybackProfile';
import type { TtsPublishedUiState } from './sessionTypes';

type UseTtsRuntimeRefsArgs = {
  ttsPracticeText: string;
};

export function useTtsRuntimeRefs({ ttsPracticeText }: UseTtsRuntimeRefsArgs) {
  const previousLagRef = useRef(0);
  const previousAccuracyRef = useRef(100);
  const ttsPracticeLiveTextRef = useRef('');

  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const telemetryRef = useRef<SessionTelemetry | null>(null);
  const ttsStartedAtMsRef = useRef<number | null>(null);
  const ttsChunkStartMsRef = useRef<number | null>(null);
  const ttsChunkStartWordIndexRef = useRef(0);
  const ttsChunkWordCountRef = useRef(0);
  const ttsCompletedSourceWordsRef = useRef(0);
  const ttsPausedAtWordIndexRef = useRef<number | null>(null);
  const ttsLagOutlierCountRef = useRef(0);
  const ttsLastValidControlLagSecRef = useRef(0);
  const ttsUnsafeChunkCountRef = useRef(0);
  const ttsChunkAccuracyWindowRef = useRef<number[]>([]);
  const ttsLastAccuracySnapshotRef = useRef({ typedWords: 0, matchedWords: 0 });
  const ttsLastControllerActionRef = useRef<ControlAction>('hold');
  const applyTtsPerformanceSampleRef = useRef<() => void>(() => undefined);
  const stopTtsPlaybackRef = useRef<() => void>(() => undefined);
  const ttsSemanticPhraseAdvanceCountRef = useRef(0);
  const ttsSemanticPhraseReplayCountRef = useRef(0);
  const ttsLiveSignalRef = useRef<TtsLiveSignal>({
    accuracy: 100,
    lagSec: 0,
    rawLagSec: 0,
    stableLagSec: 0,
    lagOutlierCount: 0,
    wpm: 0,
    trend: 'stable',
    controllerState: 'hold',
  });
  const ttsUiLastPublishedAtRef = useRef(0);
  const ttsPublishedUiRef = useRef<TtsPublishedUiState>({
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    trend: 'stable',
  });

  useEffect(() => {
    ttsPracticeLiveTextRef.current = ttsPracticeText;
  }, [ttsPracticeText]);

  return {
    previousLagRef,
    previousAccuracyRef,
    ttsPracticeLiveTextRef,
    ttsUtteranceRef,
    telemetryRef,
    ttsStartedAtMsRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef,
    ttsLagOutlierCountRef,
    ttsLastValidControlLagSecRef,
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
    ttsLastControllerActionRef,
    applyTtsPerformanceSampleRef,
    stopTtsPlaybackRef,
    ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef,
    ttsLiveSignalRef,
    ttsUiLastPublishedAtRef,
    ttsPublishedUiRef,
  };
}
