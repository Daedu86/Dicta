import { createBrowserTtsPlaybackLoopCursor } from './browserTtsPlaybackLoopCursor';
import { createBrowserTtsPlaybackLoopStartContext } from './browserTtsPlaybackLoopStartContext';
import { resolveBrowserTtsPlaybackStartError } from './browserTtsPlaybackLoopGuards';
import { speakBrowserTtsPlaybackLoopChunk } from './browserTtsPlaybackLoopChunkSpeaker';
import {
  createBrowserTtsPlaybackLoopChunkSpeakerInput,
  createBrowserTtsPlaybackLoopMacroPhraseStep,
} from './browserTtsPlaybackLoopChunkInput';
import {
  createBrowserTtsPlaybackLoopContexts,
  finishBrowserTtsPlaybackLoopRun,
  startBrowserTtsPlaybackLoopRun,
  type BrowserTtsPlaybackLoopRunOptions,
} from './browserTtsPlaybackLoopRunContexts';

export function runBrowserTtsPlaybackLoop(options: BrowserTtsPlaybackLoopRunOptions): void {
  const startError = resolveBrowserTtsPlaybackStartError({
    activeSessionFinished: options.activeSessionFinished,
    ttsText: options.ttsText,
    isBrowserTtsSupported: options.isBrowserTtsSupported,
  });
  if (startError) {
    options.setError(startError);
    return;
  }

  options.stopTtsPlaybackRef.current();
  const startContext = createBrowserTtsPlaybackLoopStartContext({
    activeSession: options.activeSession,
    ttsText: options.ttsText,
    ttsLanguage: options.ttsLanguage,
    ttsPacingMode: options.ttsPacingMode,
    startWordIndex: options.startWordIndex,
    buildSemanticPhrasesForCurrentSession: options.buildSemanticPhrasesForCurrentSession,
    resolveActiveBrowserTtsVoice: options.resolveActiveBrowserTtsVoice,
    collectBrowserTtsEnvironmentForSession: options.collectBrowserTtsEnvironmentForSession,
  });
  if (!startContext.ok) {
    options.setError(startContext.error);
    return;
  }

  const { playbackStartPlan, browserTtsVoice, browserTtsEnvironment } = startContext;
  const playbackCursor = createBrowserTtsPlaybackLoopCursor({
    chunkIndex: playbackStartPlan.chunkIndex,
    macroPhraseIndex: playbackStartPlan.macroPhraseIndex,
    macroWordOffset: playbackStartPlan.macroWordOffset,
    lastPhraseSize: playbackStartPlan.lastPhraseSize,
    lastBoundaryStrictness: playbackStartPlan.lastBoundaryStrictness,
  });
  let cancelled = false;

  if (playbackStartPlan.clampedStartWordIndex === 0) {
    options.beginAdaptiveSessionFeedback('browser-tts', options.ttsLanguage, playbackStartPlan.semanticPhrases.length);
  }

  startBrowserTtsPlaybackLoopRun(options, playbackStartPlan.clampedStartWordIndex);
  const loopContexts = createBrowserTtsPlaybackLoopContexts({
    options,
    browserTtsVoice,
    browserTtsEnvironment,
  });

  const setCancelled = (nextCancelled: boolean): void => {
    cancelled = nextCancelled;
  };

  const speakNext = (): void => {
    const cursor = playbackCursor.get();
    if (cancelled || cursor.macroPhraseIndex >= playbackStartPlan.semanticPhrases.length) {
      finishBrowserTtsPlaybackLoopRun(options);
      return;
    }

    const macroPhraseStep = createBrowserTtsPlaybackLoopMacroPhraseStep(playbackStartPlan, cursor);
    if (macroPhraseStep.shouldSkip) {
      playbackCursor.advanceMacroPhrase();
      if (!cancelled) speakNext();
      return;
    }

    if (cursor.macroWordOffset === 0) {
      options.recordPhrasePlaybackEvent(
        'phrase_started',
        'browser-tts',
        options.ttsLanguage,
        macroPhraseStep.semanticPhrase,
        cursor.macroPhraseIndex,
      );
    }

    const chunkSpeakerInput = createBrowserTtsPlaybackLoopChunkSpeakerInput({
      options,
      playbackStartPlan,
      cursor,
      macroPhraseStep,
      contexts: loopContexts,
      callbacks: {
        speakNext,
        updatePlaybackCursor: (nextCursor) => {
          playbackCursor.updatePosition(nextCursor);
        },
        setCancelled,
      },
    });

    const result = speakBrowserTtsPlaybackLoopChunk(chunkSpeakerInput);
    if (!result.ok) {
      playbackCursor.advanceMacroPhrase();
      if (!cancelled) speakNext();
      return;
    }

    playbackCursor.updateDecisionState({
      lastPhraseSize: result.playbackPlan.nextLastPhraseSize,
      lastBoundaryStrictness: result.playbackPlan.nextLastBoundaryStrictness,
    });
  };

  speakNext();
}
