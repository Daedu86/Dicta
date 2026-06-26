import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBrowserTtsChunkCompletionDebugUpdate } from './browserTtsAdaptiveSemanticDebug';
import { completeBrowserTtsChunk } from './browserTtsChunkCompletion';
import { isBrowserTtsChunkTypedWithTolerantMatch } from './browserTtsChunkCompletionGate';
import { scheduleBrowserTtsNextChunk } from './browserTtsNextChunkScheduler';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlan';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';
import { buildBrowserTtsPhraseCompletionTelemetry } from './browserTtsPhraseCompletionTelemetry';
import { applyCompletedChunkPunctuation } from './completedChunkPunctuation';

type BrowserTtsPlaybackCursor = {
  chunkIndex: number;
  macroPhraseIndex: number;
  macroWordOffset: number;
};

type BrowserTtsPlaybackLoopCompletionHandlerParams = {
  perfDiagnostics: BrowserTtsPlaybackLoopOptions['perfDiagnostics'];
  perfUtteranceId: ReturnType<BrowserTtsPlaybackLoopOptions['perfDiagnostics']['beginTtsUtterance']>;
  cancelled: boolean;
  chunkIndex: number;
  macroPhraseIndex: number;
  macroWordOffset: number;
  macroWordsLength: number;
  chunk: BrowserTtsPlaybackPlan['chunk'];
  effectivePauseNow: BrowserTtsPlaybackPlan['effectivePauseNow'];
  effectiveReplay: BrowserTtsPlaybackPlan['effectiveReplay'];
  pauseBeforeNextChunkMs: BrowserTtsPlaybackPlan['pauseBeforeNextChunkMs'];
  runtimeDecision: BrowserTtsPlaybackPlan['runtimeDecision'];
  ttsCompletedSourceWordsRef: BrowserTtsPlaybackLoopOptions['ttsCompletedSourceWordsRef'];
  ttsText: BrowserTtsPlaybackLoopOptions['ttsText'];
  ttsPracticeLiveTextRef: BrowserTtsPlaybackLoopOptions['ttsPracticeLiveTextRef'];
  setTtsPracticeText: BrowserTtsPlaybackLoopOptions['setTtsPracticeText'];
  ttsTranscript: BrowserTtsPlaybackLoopOptions['ttsTranscript'];
  browserTtsSafePauseGateSettings: BrowserTtsPlaybackLoopOptions['browserTtsSafePauseGateSettings'];
  recordPhrasePlaybackEvent: BrowserTtsPlaybackLoopOptions['recordPhrasePlaybackEvent'];
  ttsLanguage: BrowserTtsPlaybackLoopOptions['ttsLanguage'];
  semanticPhrase: ReturnType<BrowserTtsPlaybackLoopOptions['buildSemanticPhrasesForCurrentSession']>[number];
  applyTtsPerformanceSample: BrowserTtsPlaybackLoopOptions['applyTtsPerformanceSample'];
  ttsLiveSignalRef: BrowserTtsPlaybackLoopOptions['ttsLiveSignalRef'];
  chunkTelemetry: BrowserTtsPlaybackPlan['chunkTelemetry'];
  ttsUnsafeChunkCountRef: BrowserTtsPlaybackLoopOptions['ttsUnsafeChunkCountRef'];
  recordAdaptiveBenchmark: BrowserTtsPlaybackLoopOptions['recordAdaptiveBenchmark'];
  rate: BrowserTtsPlaybackPlan['rate'];
  browserTtsEnvironment: ReturnType<BrowserTtsPlaybackLoopOptions['collectBrowserTtsEnvironmentForSession']>;
  semanticPhrases: ReturnType<BrowserTtsPlaybackLoopOptions['buildSemanticPhrasesForCurrentSession']>;
  ttsSemanticPhraseAdvanceCountRef: BrowserTtsPlaybackLoopOptions['ttsSemanticPhraseAdvanceCountRef'];
  ttsSemanticPhraseReplayCountRef: BrowserTtsPlaybackLoopOptions['ttsSemanticPhraseReplayCountRef'];
  setAdaptiveSemanticDebug: BrowserTtsPlaybackLoopOptions['setAdaptiveSemanticDebug'];
  speakNext: () => void;
  updatePlaybackCursor: (cursor: BrowserTtsPlaybackCursor) => void;
};

function flushBrowserTtsChunkLiveMetrics({
  autoPunctuation,
  ttsPracticeLiveTextRef,
  setTtsPracticeText,
  applyTtsPerformanceSample,
}: Pick<
  BrowserTtsPlaybackLoopCompletionHandlerParams,
  'ttsPracticeLiveTextRef' | 'setTtsPracticeText' | 'applyTtsPerformanceSample'
> & {
  autoPunctuation?: {
    targetText: string;
    completedWordCount: number;
  };
}): void {
  let practiceText = ttsPracticeLiveTextRef.current;
  if (autoPunctuation && canAutoPunctuateCurrentTextarea()) {
    const punctuatedText = applyCompletedChunkPunctuation({
      targetText: autoPunctuation.targetText,
      typedText: practiceText,
      completedWordCount: autoPunctuation.completedWordCount,
    });
    if (punctuatedText !== practiceText) {
      ttsPracticeLiveTextRef.current = punctuatedText;
      practiceText = punctuatedText;
    }
  }

  setTtsPracticeText(practiceText);
  applyTtsPerformanceSample({
    forcePublishUi: true,
    practiceTextOverride: practiceText,
  });
}

function canAutoPunctuateCurrentTextarea(): boolean {
  const activeElement = typeof document === 'undefined' ? null : document.activeElement;
  if (!activeElement || activeElement.tagName !== 'TEXTAREA') return true;

  const textarea = activeElement as HTMLTextAreaElement;
  const selectionStart = textarea.selectionStart ?? textarea.value.length;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  return selectionStart === selectionEnd && selectionEnd === textarea.value.length;
}

export function handleBrowserTtsPlaybackLoopChunkEnd({
  perfDiagnostics,
  perfUtteranceId,
  cancelled,
  chunkIndex,
  macroPhraseIndex,
  macroWordOffset,
  macroWordsLength,
  chunk,
  effectivePauseNow,
  effectiveReplay,
  pauseBeforeNextChunkMs,
  runtimeDecision,
  ttsCompletedSourceWordsRef,
  ttsText,
  ttsPracticeLiveTextRef,
  setTtsPracticeText,
  ttsTranscript,
  browserTtsSafePauseGateSettings,
  recordPhrasePlaybackEvent,
  ttsLanguage,
  semanticPhrase,
  applyTtsPerformanceSample,
  ttsLiveSignalRef,
  chunkTelemetry,
  ttsUnsafeChunkCountRef,
  recordAdaptiveBenchmark,
  rate,
  browserTtsEnvironment,
  semanticPhrases,
  ttsSemanticPhraseAdvanceCountRef,
  ttsSemanticPhraseReplayCountRef,
  setAdaptiveSemanticDebug,
  speakNext,
  updatePlaybackCursor,
}: BrowserTtsPlaybackLoopCompletionHandlerParams): void {
  perfDiagnostics.recordTtsEnd(perfUtteranceId);
  if (cancelled) return;

  const chunkCompletion = completeBrowserTtsChunk({
    macroPhraseIndex,
    macroWordOffset,
    macroWordsLength,
    chunkStartWordIndex: chunk.startWordIndex,
    chunkWordCount: chunk.wordCount,
    effectivePauseNow,
    pauseAfterPhraseMs: pauseBeforeNextChunkMs,
  });

  const { completesMacroPhrase } = chunkCompletion;
  ttsCompletedSourceWordsRef.current = chunkCompletion.completedSourceWords;

  if (completesMacroPhrase) {
    recordPhrasePlaybackEvent('phrase_completed', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
  }

  const nextCursor = {
    chunkIndex: chunkIndex + 1,
    macroPhraseIndex: chunkCompletion.nextMacroPhraseIndex,
    macroWordOffset: chunkCompletion.nextMacroWordOffset,
  };

  updatePlaybackCursor(nextCursor);

  flushBrowserTtsChunkLiveMetrics({
    ttsPracticeLiveTextRef,
    setTtsPracticeText,
    applyTtsPerformanceSample,
  });

  if (chunkCompletion.phraseAdvanced) {
    ttsSemanticPhraseAdvanceCountRef.current += 1;
    recordPhrasePlaybackEvent('phrase_advanced', 'browser-tts', ttsLanguage, semanticPhrase, nextCursor.macroPhraseIndex);
  }

  setAdaptiveSemanticDebug((current) =>
    buildBrowserTtsChunkCompletionDebugUpdate({
      current,
      macroPhraseIndex: nextCursor.macroPhraseIndex,
      semanticPhrases,
      phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
      phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
    }),
  );

  scheduleBrowserTtsNextChunk({
    shouldPauseBeforeNextChunk: chunkCompletion.shouldPauseBeforeNextChunk,
    pauseBeforeNextChunkMs: chunkCompletion.pauseBeforeNextChunkMs,
    scheduleTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    safePauseGateSettings: browserTtsSafePauseGateSettings,
    completionGate: chunkCompletion.shouldPauseBeforeNextChunk && chunk.canPauseAfter && ttsTranscript
      ? {
          isComplete: () =>
            isBrowserTtsChunkTypedWithTolerantMatch({
              typedText: ttsPracticeLiveTextRef.current,
              transcript: ttsTranscript,
              chunk,
            }),
        }
      : undefined,
    onResolved: (actualWaitMs, pauseGateResolutionReason) => {
      if (actualWaitMs > 0 || pauseGateResolutionReason !== 'no-gate') {
        flushBrowserTtsChunkLiveMetrics({
          autoPunctuation: pauseGateResolutionReason === 'completed'
            ? {
                targetText: ttsText,
                completedWordCount: chunk.startWordIndex + chunk.wordCount,
              }
            : undefined,
          ttsPracticeLiveTextRef,
          setTtsPracticeText,
          applyTtsPerformanceSample,
        });
      }

      recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {
        actualPlaybackRate: rate,
        actualPauseMs: actualWaitMs,
        pauseGateResolutionReason,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        ttsEnvironment: browserTtsEnvironment,
        event: resolveBrowserTtsBenchmarkEvent({ effectiveReplay, effectivePauseNow, runtimeDecision }),
        phraseIndex: macroPhraseIndex,
        totalSemanticPhrases: semanticPhrases.length,
      });

      if (completesMacroPhrase && normalizeBenchmarkLanguage(ttsLanguage) === 'de') {
        const completionLiveSignal = ttsLiveSignalRef.current;
        const completionTelemetry = buildBrowserTtsPhraseCompletionTelemetry({
          chunkTelemetry,
          semanticPhraseId: semanticPhrase?.id,
          macroPhraseIndex,
          liveSignal: completionLiveSignal,
          unsafeChunkCount: ttsUnsafeChunkCountRef.current,
        });

        recordAdaptiveBenchmark(completionTelemetry, runtimeDecision, {
          actualPlaybackRate: rate,
          actualPauseMs: actualWaitMs,
          pauseGateResolutionReason,
          replayExecuted: false,
          actualBoundaryType: chunk.phraseBoundaryType,
          ttsEnvironment: browserTtsEnvironment,
          event: 'phrase_completed',
          phraseIndex: macroPhraseIndex,
          totalSemanticPhrases: semanticPhrases.length,
        });
      }
    },
    speakNext,
  });
}

function resolveBrowserTtsBenchmarkEvent({
  effectiveReplay,
  effectivePauseNow,
  runtimeDecision,
}: Pick<BrowserTtsPlaybackPlan, 'effectiveReplay' | 'effectivePauseNow' | 'runtimeDecision'>): 'replay' | 'pause' | 'defer_pause' | 'phrase_advance' {
  if (effectiveReplay) return 'replay';
  if (effectivePauseNow) return 'pause';
  if (runtimeDecision.deferPauseUntilSafeBoundary) return 'defer_pause';
  return 'phrase_advance';
}
