import { useMemo } from 'react';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { clamp } from './appRuntimeHelpers';
import type {
  TtsPlaybackControls,
  TtsPlaybackControlsOptions,
} from './useTtsPlaybackControlsTypes';

export type {
  StateSetter,
  TtsPlaybackControls,
  TtsPlaybackControlsOptions,
  WritableRef,
} from './useTtsPlaybackControlsTypes';

export function createTtsPlaybackControls({
  activeInputMode,
  activeSessionFinished,
  ttsHasText,
  ttsStatus,
  ttsText,
  ttsPracticeText,
  ttsTranscriptWordCount,
  isBrowserTtsSupported,
  cancelBrowserTts,
  resumeBrowserTts,
  estimateTtsSpokenWordIndex,
  playTtsFromWord,
  recordTtsTelemetryAction,
  ttsStartedAtMsRef,
  ttsUtteranceRef,
  ttsChunkStartMsRef,
  ttsCompletedSourceWordsRef,
  ttsPausedAtWordIndexRef,
  setTtsCurrentChunk,
  setTtsPacingMode,
  setTtsSpeechRate,
  setRunning,
  setSessionStatus,
  setTtsStatus,
  setTtsPlayerProgressTick,
  nowMs = () => performance.now(),
}: TtsPlaybackControlsOptions): TtsPlaybackControls {
  function pauseTts(): void {
    if (isBrowserTtsSupported()) {
      ttsPausedAtWordIndexRef.current = estimateTtsSpokenWordIndex();
      cancelBrowserTts();
      ttsUtteranceRef.current = null;
      ttsChunkStartMsRef.current = null;
    }

    recordTtsTelemetryAction('pause');
    setRunning(false);
    setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
    setTtsStatus((current) => (current === 'playing' ? 'paused' : current));
  }

  function resumeTts(): void {
    if (!isBrowserTtsSupported()) return;
    if (ttsPausedAtWordIndexRef.current !== null) {
      playTtsFromWord(ttsPausedAtWordIndexRef.current);
      return;
    }
    resumeBrowserTts();
    recordTtsTelemetryAction('resume');
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = nowMs();
    }
    setRunning(true);
    setSessionStatus((current) => (current === 'finished' ? current : 'running'));
    setTtsStatus('playing');
  }

  function stopTtsPlayback(action?: Parameters<TtsPlaybackControls['stopTtsPlayback']>[0]): void {
    if (action) {
      recordTtsTelemetryAction(action);
    }
    if (isBrowserTtsSupported()) {
      cancelBrowserTts();
    }
    ttsUtteranceRef.current = null;
    ttsChunkStartMsRef.current = null;
    ttsPausedAtWordIndexRef.current = null;
    ttsCompletedSourceWordsRef.current = 0;
    setTtsCurrentChunk('');
    setTtsPacingMode('balanced');
    setTtsSpeechRate(1);
    setRunning(false);
    setSessionStatus((current) => {
      if (current === 'finished') return current;
      return ttsPracticeText.trim() ? 'paused' : 'ready';
    });
    setTtsStatus(ttsText.trim() ? 'ready' : 'idle');
  }

  function seekTtsPlayback(percent: number): void {
    if (activeInputMode !== BROWSER_TTS_SESSION_INPUT_MODE || !ttsHasText || activeSessionFinished) return;
    const wordCount = ttsTranscriptWordCount;
    if (wordCount === 0) return;
    const targetWordIndex = Math.floor(clamp(percent, 0, 1) * Math.max(0, wordCount - 1));
    if (isBrowserTtsSupported()) {
      cancelBrowserTts();
    }
    ttsPausedAtWordIndexRef.current = null;
    ttsCompletedSourceWordsRef.current = targetWordIndex;
    ttsChunkStartMsRef.current = null;
    recordTtsTelemetryAction('seek');
    if (ttsStatus === 'playing' || ttsStatus === 'paused') {
      playTtsFromWord(targetWordIndex);
    } else {
      setTtsStatus('ready');
      setRunning(false);
      setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
      setTtsPlayerProgressTick((value) => value + 1);
    }
  }

  return {
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
  };
}

export function useTtsPlaybackControls(options: TtsPlaybackControlsOptions): TtsPlaybackControls {
  return useMemo(
    () => createTtsPlaybackControls(options),
    [
      options.activeInputMode,
      options.activeSessionFinished,
      options.cancelBrowserTts,
      options.estimateTtsSpokenWordIndex,
      options.isBrowserTtsSupported,
      options.nowMs,
      options.playTtsFromWord,
      options.recordTtsTelemetryAction,
      options.resumeBrowserTts,
      options.setRunning,
      options.setSessionStatus,
      options.setTtsCurrentChunk,
      options.setTtsPacingMode,
      options.setTtsPlayerProgressTick,
      options.setTtsSpeechRate,
      options.setTtsStatus,
      options.ttsChunkStartMsRef,
      options.ttsCompletedSourceWordsRef,
      options.ttsHasText,
      options.ttsPausedAtWordIndexRef,
      options.ttsPracticeText,
      options.ttsStartedAtMsRef,
      options.ttsStatus,
      options.ttsText,
      options.ttsTranscriptWordCount,
      options.ttsUtteranceRef,
    ],
  );
}
