import type { BrowserTtsPlaybackLoopChunkPlanInput } from './browserTtsPlaybackLoopChunkPlan';
import type { SpeakBrowserTtsPlaybackLoopChunkInput } from './browserTtsPlaybackLoopChunkSpeaker';
import type { BrowserTtsPlaybackStartPlan } from './browserTtsPlaybackStartPlan';
import type {
  BrowserTtsPlaybackChunkCallbacks,
  BrowserTtsPlaybackCursorSnapshot,
} from './browserTtsPlaybackLoopTypes';
import type {
  BrowserTtsPlaybackLoopContexts,
  BrowserTtsPlaybackLoopRunOptions,
} from './browserTtsPlaybackLoopRunContexts';

type SuccessfulBrowserTtsPlaybackStartPlan = Extract<BrowserTtsPlaybackStartPlan, { ok: true }>;
type BrowserTtsPlaybackLoopSemanticPhrase = SuccessfulBrowserTtsPlaybackStartPlan['semanticPhrases'][number];

export type BrowserTtsPlaybackLoopMacroPhraseStep = {
  semanticPhrase: BrowserTtsPlaybackLoopSemanticPhrase;
  macroWords: string[];
  macroStartWordIndex: number;
  shouldSkip: boolean;
};

type BrowserTtsPlaybackLoopChunkSpeakerInputOptions = {
  options: BrowserTtsPlaybackLoopRunOptions;
  playbackStartPlan: SuccessfulBrowserTtsPlaybackStartPlan;
  cursor: BrowserTtsPlaybackCursorSnapshot;
  macroPhraseStep: BrowserTtsPlaybackLoopMacroPhraseStep;
  contexts: BrowserTtsPlaybackLoopContexts;
  callbacks: BrowserTtsPlaybackChunkCallbacks;
};

export function createBrowserTtsPlaybackLoopMacroPhraseStep(
  playbackStartPlan: SuccessfulBrowserTtsPlaybackStartPlan,
  cursor: BrowserTtsPlaybackCursorSnapshot,
): BrowserTtsPlaybackLoopMacroPhraseStep {
  const semanticPhrase = playbackStartPlan.semanticPhrases[cursor.macroPhraseIndex];
  const macroWords = playbackStartPlan.semanticPhraseWords[cursor.macroPhraseIndex] ?? [];
  const macroStartWordIndex = playbackStartPlan.semanticPhraseStartWordIndices[cursor.macroPhraseIndex] ?? 0;

  return {
    semanticPhrase,
    macroWords,
    macroStartWordIndex,
    shouldSkip: macroWords.length === 0 || cursor.macroWordOffset >= macroWords.length,
  };
}

export function createBrowserTtsPlaybackLoopChunkSpeakerInput({
  options,
  playbackStartPlan,
  cursor,
  macroPhraseStep,
  contexts,
  callbacks,
}: BrowserTtsPlaybackLoopChunkSpeakerInputOptions): SpeakBrowserTtsPlaybackLoopChunkInput {
  const planInput = createBrowserTtsPlaybackLoopChunkPlanInput({
    options,
    playbackStartPlan,
    cursor,
    macroPhraseStep,
  });

  return {
    playbackRuntime: contexts.playbackRuntime,
    runnerState: {
      cursor,
      macroPhrase: {
        semanticPhrase: macroPhraseStep.semanticPhrase,
        semanticPhrases: playbackStartPlan.semanticPhrases,
        macroWords: macroPhraseStep.macroWords,
        macroStartWordIndex: macroPhraseStep.macroStartWordIndex,
        sourceWordCount: playbackStartPlan.sourceWords.length,
        macroPhraseIndex: cursor.macroPhraseIndex,
        macroWordOffset: cursor.macroWordOffset,
      },
    },
    planInput,
    progressContext: contexts.progressContext,
    adaptiveContext: contexts.adaptiveContext,
    telemetryContext: contexts.telemetryContext,
    uiContext: contexts.uiContext,
    callbacks,
  };
}

function createBrowserTtsPlaybackLoopChunkPlanInput({
  options,
  playbackStartPlan,
  cursor,
  macroPhraseStep,
}: Omit<BrowserTtsPlaybackLoopChunkSpeakerInputOptions, 'contexts' | 'callbacks'>): BrowserTtsPlaybackLoopChunkPlanInput {
  return {
    ttsLanguage: options.ttsLanguage,
    ttsTranscript: options.ttsTranscript,
    ttsLiveSignalRef: options.ttsLiveSignalRef,
    ttsPracticeLiveTextRef: options.ttsPracticeLiveTextRef,
    getHistoricalPerformanceProfile: options.getHistoricalPerformanceProfile,
    getBenchmarkSnapshot: options.getBenchmarkSnapshot,
    ttsSpeechRate: options.ttsSpeechRate,
    ttsPlaybackProfile: options.ttsPlaybackProfile,
    getAdaptiveController: options.getAdaptiveController,
    estimateTtsSpokenWordIndex: options.estimateTtsSpokenWordIndex,
    macroWords: macroPhraseStep.macroWords,
    macroWordOffset: cursor.macroWordOffset,
    macroStartWordIndex: macroPhraseStep.macroStartWordIndex,
    lastPhraseSize: cursor.lastPhraseSize,
    lastBoundaryStrictness: cursor.lastBoundaryStrictness,
    sourceWordCount: playbackStartPlan.sourceWords.length,
    chunkIndex: cursor.chunkIndex,
    unsafeChunkCount: options.ttsUnsafeChunkCountRef.current,
    accuracyWindow: options.ttsChunkAccuracyWindowRef.current,
    lastAccuracySnapshot: options.ttsLastAccuracySnapshotRef.current,
  };
}
