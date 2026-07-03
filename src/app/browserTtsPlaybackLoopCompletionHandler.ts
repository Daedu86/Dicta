import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBrowserTtsChunkCompletionDebugUpdate } from './browserTtsAdaptiveSemanticDebug';
import { completeBrowserTtsChunk } from './browserTtsChunkCompletion';
import { isBrowserTtsChunkTypedWithTolerantMatch } from './browserTtsChunkCompletionGate';
import { scheduleBrowserTtsNextChunk } from './browserTtsNextChunkScheduler';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlan';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';
import { buildBrowserTtsPhraseCompletionTelemetry } from './browserTtsPhraseCompletionTelemetry';
import { applyCompletedChunkPunctuation } from './completedChunkPunctuation';
import {
  findBrowserTtsPracticeChunkForPhrase,
  type BrowserTtsPracticeChunkDefinition,
} from './browserTtsPracticeChunks';

const SAFE_PAUSE_AUTO_PUNCTUATION_IDLE_MS = 200;

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
  ttsPracticeLastInputAtMsRef: BrowserTtsPlaybackLoopOptions['ttsPracticeLastInputAtMsRef'];
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
  practiceChunks?: BrowserTtsPracticeChunkDefinition[];
  practiceChunkAdvanceRequestRef?: BrowserTtsPlaybackLoopOptions['practiceChunkAdvanceRequestRef'];
  onPracticeChunkResolved?: BrowserTtsPlaybackLoopOptions['onPracticeChunkResolved'];
  onPracticeChunkRestStarted?: BrowserTtsPlaybackLoopOptions['onPracticeChunkRestStarted'];
  onPracticeChunkAudioCompleted?: BrowserTtsPlaybackLoopOptions['onPracticeChunkAudioCompleted'];
};

function flushBrowserTtsChunkLiveMetrics({
  autoPunctuation,
  ttsPracticeLiveTextRef,
  ttsPracticeLastInputAtMsRef,
  setTtsPracticeText,
  applyTtsPerformanceSample,
}: Pick<
  BrowserTtsPlaybackLoopCompletionHandlerParams,
  'ttsPracticeLiveTextRef' | 'ttsPracticeLastInputAtMsRef' | 'setTtsPracticeText' | 'applyTtsPerformanceSample'
> & {
  autoPunctuation?: {
    targetText: string;
    completedWordCount: number;
    nowMs?: () => number;
  };
}): void {
  const practiceText = autoPunctuation
    ? applySafePausePunctuation({
        autoPunctuation,
        ttsPracticeLiveTextRef,
        ttsPracticeLastInputAtMsRef,
      })
    : ttsPracticeLiveTextRef.current;

  setTtsPracticeText(practiceText);
  applyTtsPerformanceSample({
    forcePublishUi: true,
    practiceTextOverride: practiceText,
  });
}

function applySafePausePunctuation({
  autoPunctuation,
  ttsPracticeLiveTextRef,
  ttsPracticeLastInputAtMsRef,
}: {
  autoPunctuation: {
    targetText: string;
    completedWordCount: number;
    nowMs?: () => number;
  };
  ttsPracticeLiveTextRef: BrowserTtsPlaybackLoopOptions['ttsPracticeLiveTextRef'];
  ttsPracticeLastInputAtMsRef: BrowserTtsPlaybackLoopOptions['ttsPracticeLastInputAtMsRef'];
}): string {
  const practiceText = ttsPracticeLiveTextRef.current;
  const nowMs = autoPunctuation.nowMs ?? (() => performance.now());
  if (nowMs() - ttsPracticeLastInputAtMsRef.current < SAFE_PAUSE_AUTO_PUNCTUATION_IDLE_MS) {
    return practiceText;
  }

  const punctuatedText = applyCompletedChunkPunctuation({
    targetText: autoPunctuation.targetText,
    typedText: practiceText,
    completedWordCount: autoPunctuation.completedWordCount,
  });
  if (punctuatedText === practiceText) return practiceText;

  const activeTextarea = getActiveTextarea();
  if (activeTextarea && !canPatchTextareaSafely(activeTextarea, practiceText)) {
    return practiceText;
  }

  if (activeTextarea) {
    activeTextarea.value = punctuatedText;
    const end = punctuatedText.length;
    activeTextarea.setSelectionRange(end, end);
  }

  ttsPracticeLiveTextRef.current = punctuatedText;
  return punctuatedText;
}

function getActiveTextarea(): HTMLTextAreaElement | null {
  const activeElement = typeof document === 'undefined' ? null : document.activeElement;
  if (!activeElement || activeElement.tagName !== 'TEXTAREA') return null;
  return activeElement as HTMLTextAreaElement;
}

function canPatchTextareaSafely(textarea: HTMLTextAreaElement, expectedText: string): boolean {
  if (textarea.value !== expectedText) return false;
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
  ttsPracticeLastInputAtMsRef,
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
  practiceChunks = [],
  practiceChunkAdvanceRequestRef,
  onPracticeChunkResolved,
  onPracticeChunkRestStarted,
  onPracticeChunkAudioCompleted,
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
    ttsPracticeLastInputAtMsRef,
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

  const practiceChunk = findBrowserTtsPracticeChunkForPhrase(practiceChunks, macroPhraseIndex);
  const isPracticeBoundary = Boolean(
    practiceChunk &&
    completesMacroPhrase &&
    practiceChunk.lastSemanticPhraseIndex === macroPhraseIndex,
  );
  const learnerPacedPracticeBoundary = Boolean(
    isPracticeBoundary &&
    practiceChunkAdvanceRequestRef &&
    onPracticeChunkResolved,
  );
  const suppressInternalPracticePause = Boolean(practiceChunk && !isPracticeBoundary);

  if (isPracticeBoundary && practiceChunk) {
    onPracticeChunkAudioCompleted?.(practiceChunk);
  }

  if (learnerPacedPracticeBoundary && practiceChunk?.isFinal) {
    const finalWasSubmittedEarly = practiceChunkAdvanceRequestRef?.current === practiceChunk.index;
    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: finalWasSubmittedEarly,
      pauseBeforeNextChunkMs: 0,
      scheduleTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      completionGate: finalWasSubmittedEarly
        ? {
            isComplete: () => false,
            getResolutionReason: () => 'submitted',
            disableTimeout: true,
            onRestStarted: (remainingRestMs) => {
              onPracticeChunkRestStarted?.(practiceChunk, remainingRestMs);
            },
          }
        : undefined,
      onResolved: (actualWaitMs, pauseGateResolutionReason) => {
        if (pauseGateResolutionReason === 'submitted') {
          if (practiceChunkAdvanceRequestRef) practiceChunkAdvanceRequestRef.current = null;
          onPracticeChunkResolved?.(practiceChunk, 'submitted');
        }
        recordResolvedBrowserTtsChunk({
          actualWaitMs,
          pauseGateResolutionReason,
          params: {
            chunk,
            chunkTelemetry,
            runtimeDecision,
            rate,
            effectiveReplay,
            effectivePauseNow,
            browserTtsEnvironment,
            macroPhraseIndex,
            semanticPhrase,
            semanticPhrases,
            ttsLanguage,
            ttsLiveSignalRef,
            ttsUnsafeChunkCountRef,
            recordAdaptiveBenchmark,
            completesMacroPhrase,
            pauseSuppressedForPracticeChunk: false,
          },
        });
      },
      speakNext,
    });
    return;
  }

  scheduleBrowserTtsNextChunk({
    shouldPauseBeforeNextChunk:
      learnerPacedPracticeBoundary || (!suppressInternalPracticePause && chunkCompletion.shouldPauseBeforeNextChunk),
    pauseBeforeNextChunkMs: chunkCompletion.pauseBeforeNextChunkMs,
    scheduleTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    safePauseGateSettings: browserTtsSafePauseGateSettings,
    completionGate: learnerPacedPracticeBoundary && practiceChunk
      ? {
          isComplete: () => false,
          getResolutionReason: () =>
            practiceChunkAdvanceRequestRef?.current === practiceChunk.index ? 'submitted' : null,
          disableTimeout: true,
          onRestStarted: (remainingRestMs) => {
            onPracticeChunkRestStarted?.(practiceChunk, remainingRestMs);
          },
        }
      : !suppressInternalPracticePause && chunkCompletion.shouldPauseBeforeNextChunk && chunk.canPauseAfter && ttsTranscript
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
      if (practiceChunk && learnerPacedPracticeBoundary && pauseGateResolutionReason === 'submitted') {
        if (practiceChunkAdvanceRequestRef) practiceChunkAdvanceRequestRef.current = null;
        onPracticeChunkResolved?.(practiceChunk, pauseGateResolutionReason);
      }
      if (actualWaitMs > 0 || pauseGateResolutionReason !== 'no-gate') {
        flushBrowserTtsChunkLiveMetrics({
          autoPunctuation: pauseGateResolutionReason === 'completed' || pauseGateResolutionReason === 'submitted'
            ? {
                targetText: ttsText,
                completedWordCount: chunk.startWordIndex + chunk.wordCount,
              }
            : undefined,
          ttsPracticeLiveTextRef,
          ttsPracticeLastInputAtMsRef,
          setTtsPracticeText,
          applyTtsPerformanceSample,
        });
      }

      recordResolvedBrowserTtsChunk({
        actualWaitMs,
        pauseGateResolutionReason,
        params: {
          chunk,
          chunkTelemetry,
          runtimeDecision,
          rate,
          effectiveReplay,
          effectivePauseNow,
          browserTtsEnvironment,
          macroPhraseIndex,
          semanticPhrase,
          semanticPhrases,
          ttsLanguage,
          ttsLiveSignalRef,
          ttsUnsafeChunkCountRef,
          recordAdaptiveBenchmark,
          completesMacroPhrase,
          pauseSuppressedForPracticeChunk: suppressInternalPracticePause && effectivePauseNow,
        },
      });
    },
    speakNext,
  });
}

function resolveBrowserTtsBenchmarkEvent({
  effectiveReplay,
  effectivePauseNow,
  runtimeDecision,
  pauseSuppressedForPracticeChunk,
}: Pick<BrowserTtsPlaybackPlan, 'effectiveReplay' | 'effectivePauseNow' | 'runtimeDecision'> & {
  pauseSuppressedForPracticeChunk: boolean;
}): 'replay' | 'pause' | 'defer_pause' | 'phrase_advance' {
  if (effectiveReplay) return 'replay';
  if (pauseSuppressedForPracticeChunk) return 'defer_pause';
  if (effectivePauseNow) return 'pause';
  if (runtimeDecision.deferPauseUntilSafeBoundary) return 'defer_pause';
  return 'phrase_advance';
}

type ResolvedBrowserTtsChunkParams = Pick<
  BrowserTtsPlaybackLoopCompletionHandlerParams,
  | 'chunk'
  | 'chunkTelemetry'
  | 'runtimeDecision'
  | 'rate'
  | 'effectiveReplay'
  | 'effectivePauseNow'
  | 'browserTtsEnvironment'
  | 'macroPhraseIndex'
  | 'semanticPhrase'
  | 'semanticPhrases'
  | 'ttsLanguage'
  | 'ttsLiveSignalRef'
  | 'ttsUnsafeChunkCountRef'
  | 'recordAdaptiveBenchmark'
> & {
  completesMacroPhrase: boolean;
  pauseSuppressedForPracticeChunk: boolean;
};

function recordResolvedBrowserTtsChunk({
  actualWaitMs,
  pauseGateResolutionReason,
  params,
}: {
  actualWaitMs: number;
  pauseGateResolutionReason: Parameters<NonNullable<Parameters<typeof scheduleBrowserTtsNextChunk>[0]['onResolved']>>[1];
  params: ResolvedBrowserTtsChunkParams;
}): void {
  const {
    chunk,
    chunkTelemetry,
    runtimeDecision,
    rate,
    effectiveReplay,
    effectivePauseNow,
    browserTtsEnvironment,
    macroPhraseIndex,
    semanticPhrase,
    semanticPhrases,
    ttsLanguage,
    ttsLiveSignalRef,
    ttsUnsafeChunkCountRef,
    recordAdaptiveBenchmark,
    completesMacroPhrase,
    pauseSuppressedForPracticeChunk,
  } = params;

  recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {
    actualPlaybackRate: rate,
    actualPauseMs: actualWaitMs,
    pauseGateResolutionReason,
    replayExecuted: effectiveReplay,
    actualBoundaryType: chunk.phraseBoundaryType,
    ttsEnvironment: browserTtsEnvironment,
    event: resolveBrowserTtsBenchmarkEvent({
      effectiveReplay,
      effectivePauseNow,
      runtimeDecision,
      pauseSuppressedForPracticeChunk,
    }),
    phraseIndex: macroPhraseIndex,
    totalSemanticPhrases: semanticPhrases.length,
  });

  if (!completesMacroPhrase || normalizeBenchmarkLanguage(ttsLanguage) !== 'de') return;
  const completionTelemetry = buildBrowserTtsPhraseCompletionTelemetry({
    chunkTelemetry,
    semanticPhraseId: semanticPhrase?.id,
    macroPhraseIndex,
    liveSignal: ttsLiveSignalRef.current,
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
