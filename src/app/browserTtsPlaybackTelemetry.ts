import type {
  ListeningPrecisionMetrics,
  LiveTelemetryFrame,
} from '../core/adaptive/types';
import type { AttemptEvaluation } from '../core/evaluation';
import { buildBrowserTtsTelemetryFrame } from '../inputs/browserTts/browserTtsTelemetryAdapter';
import type {
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../inputs/browserTts/ttsDynamicChunkPlanner';
import { clamp01 } from './appRuntimeHelpers';
import type { BrowserTtsChunkCorrectionPressure } from './browserTtsChunkListeningMetrics';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

export function buildBrowserTtsTelemetry(params: {
  phraseId: string;
  sourceWordCount: number;
  estimatedSpokenWordIndex: number;
  livePracticeEvaluation: AttemptEvaluation;
  liveSignal: TtsLiveSignal;
  unsafeChunkCount?: number;
  sessionAccuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  listeningPrecision: ListeningPrecisionMetrics;
  correctionPressure: BrowserTtsChunkCorrectionPressure;
  pauseMs: number;
  phraseDifficulty: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  currentPlaybackRate: number;
  language: SupportedLanguage;
  chunk: PlannedBrowserTtsChunk;
}): LiveTelemetryFrame {
  return buildBrowserTtsTelemetryFrame({
    inputMode: 'browser-tts',
    phraseId: params.phraseId,
    estimatedSpokenRatio:
      params.sourceWordCount > 0 ? params.estimatedSpokenWordIndex / params.sourceWordCount : 0,
    typedProgressRatio:
      params.sourceWordCount > 0
        ? Math.max(0, params.livePracticeEvaluation.lastMatchedTargetIndex + 1) / params.sourceWordCount
        : 0,
    lagSec: params.liveSignal.lagSec,
    lagWords: Math.max(0, Math.round(params.liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
    lagChars: Math.max(0, Math.round(params.liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
    rawLagSec: params.liveSignal.rawLagSec,
    stableLagSec: params.liveSignal.stableLagSec,
    lagOutlierCount: params.liveSignal.lagOutlierCount,
    unsafeChunkCount: params.unsafeChunkCount,
    accuracy: params.sessionAccuracy,
    chunkAccuracy: params.chunkAccuracy,
    rollingAccuracyLast3: params.rollingAccuracyLast3,
    rollingAccuracyLast5: params.rollingAccuracyLast5,
    sessionAccuracy: params.sessionAccuracy,
    errorRate: clamp01(1 - params.liveSignal.accuracy / 100),
    listeningPrecision: params.listeningPrecision,
    wpm: params.liveSignal.wpm,
    charsPerMinute: 0,
    pauseMs: params.pauseMs,
    longestPauseMs: 0,
    backspaceRate: params.correctionPressure.backspaceRate,
    correctionRate: params.correctionPressure.correctionRate,
    phraseDifficulty: params.phraseDifficulty,
    phraseLengthWords: params.phraseLengthWords,
    phraseLengthChars: params.phraseLengthChars,
    currentPlaybackRate: params.currentPlaybackRate,
    currentPauseAfterPhraseMs: params.pauseMs,
    language: params.language,
    trend: params.liveSignal.trend,
    phraseBoundaryType: params.chunk.phraseBoundaryType,
    canPauseAfter: params.chunk.canPauseAfter,
    canReplayIndependently: false,
    semanticCompleteness: params.chunk.semanticCompleteness,
    punctuationLoad: params.chunk.punctuationLoad,
    rareWordLoad: params.chunk.rareWordLoad,
    syntaxComplexity: params.chunk.syntaxComplexity,
  });
}
