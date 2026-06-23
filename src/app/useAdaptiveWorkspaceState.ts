import { useRef, useState } from 'react';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../components/openrouter/types';
import type { AdaptiveSemanticDebug } from './sessionTypes';
import {
  loadAdaptiveBenchmarks,
  loadAdaptiveSessionFeedback,
} from './adaptiveStorage';

export function useAdaptiveWorkspaceState() {
  const [adaptiveSemanticDebug, setAdaptiveSemanticDebug] = useState<AdaptiveSemanticDebug>({
    semanticCutPenalty: 0,
    unsafePauseCount: 0,
    safePauseCount: 0,
    deferredPauseCount: 0,
    replayDeniedByBoundaryCount: 0,
    averageSemanticCompleteness: 1,
    averagePhraseDifficulty: 0,
    inputExecutionFidelityScore: 1,
    currentPhraseIndex: 0,
    currentPhraseId: 'n/a',
    currentPhraseTextPreview: '',
    totalSemanticPhrases: 0,
    phraseAdvanceCount: 0,
    phraseReplayCount: 0,
    lastPhraseAdvanceReason: 'idle',
  });

  const [adaptiveBenchmarksByInputLanguage, setAdaptiveBenchmarksByInputLanguage] =
    useState<AdaptiveBenchmarksByInputLanguage>(() => loadAdaptiveBenchmarks());
  const adaptiveBenchmarksRef = useRef(adaptiveBenchmarksByInputLanguage);

  const [adaptiveSessionFeedbackByInputLanguage, setAdaptiveSessionFeedbackByInputLanguage] =
    useState<AdaptiveSessionFeedbackByInputLanguage>(() => loadAdaptiveSessionFeedback());
  const adaptiveSessionFeedbackRef = useRef<AdaptiveSessionFeedbackByInputLanguage>(
    adaptiveSessionFeedbackByInputLanguage,
  );

  const [benchmarkExportMessage, setBenchmarkExportMessage] = useState('');
  const [sessionFeedbackMessage, setSessionFeedbackMessage] = useState('');

  return {
    adaptiveSemanticDebug,
    setAdaptiveSemanticDebug,
    adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    benchmarkExportMessage,
    setBenchmarkExportMessage,
    sessionFeedbackMessage,
    setSessionFeedbackMessage,
  };
}
