import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloneTelemetry } from '../core/sessionNormalization';
import type { BrowserTtsPracticeChunkTelemetry, SessionTelemetry } from '../types/dictation';
import {
  buildBrowserTtsPracticeChunkTelemetry,
  composeBrowserTtsPracticeText,
  type BrowserTtsPracticeChunkDefinition,
  type BrowserTtsPracticeChunkView,
} from './browserTtsPracticeChunks';
import type { StoredSession } from './sessionTypes';

type WritableRef<T> = { current: T };

type UseBrowserTtsPracticeChunkRuntimeArgs = {
  activeSession: StoredSession | null;
  activeSessionFinished: boolean;
  ttsPracticeText: string;
  setTtsPracticeText: (value: string) => void;
  telemetryRef: WritableRef<SessionTelemetry | null | undefined>;
  ttsPracticeLiveTextRef: WritableRef<string>;
};

export function useBrowserTtsPracticeChunkRuntime({
  activeSession,
  activeSessionFinished,
  ttsPracticeText,
  setTtsPracticeText,
  telemetryRef,
  ttsPracticeLiveTextRef,
}: UseBrowserTtsPracticeChunkRuntimeArgs) {
  const restoredChunks = useMemo(
    () => normalizeRestoredPracticeChunks(activeSession?.telemetry.practiceChunks),
    [activeSession?.id, activeSession?.telemetry.practiceChunks],
  );
  const [definitions, setDefinitions] = useState<BrowserTtsPracticeChunkDefinition[]>([]);
  const [completed, setCompleted] = useState<BrowserTtsPracticeChunkTelemetry[]>(restoredChunks);
  const [activeIndex, setActiveIndex] = useState(restoredChunks.length);
  const [draft, setDraft] = useState(restoredChunks.length === 0 ? ttsPracticeText : '');
  const [queuedIndex, setQueuedIndex] = useState<number | null>(null);
  const [finalAudioCompleted, setFinalAudioCompleted] = useState(false);
  const definitionsRef = useRef(definitions);
  const completedRef = useRef(completed);
  const activeIndexRef = useRef(activeIndex);
  const draftRef = useRef(draft);
  const finalAudioCompletedRef = useRef(finalAudioCompleted);
  const practiceChunkAdvanceRequestRef = useRef<number | null>(null);
  const finishSessionRef = useRef<(latestTextValue?: string) => void>(() => undefined);

  useEffect(() => {
    const restored = normalizeRestoredPracticeChunks(activeSession?.telemetry.practiceChunks);
    definitionsRef.current = [];
    completedRef.current = restored;
    activeIndexRef.current = restored.length;
    draftRef.current = restored.length === 0 ? activeSession?.ttsPracticeText ?? '' : '';
    finalAudioCompletedRef.current = false;
    practiceChunkAdvanceRequestRef.current = null;
    setDefinitions([]);
    setCompleted(restored);
    setActiveIndex(restored.length);
    setDraft(draftRef.current);
    setQueuedIndex(null);
    setFinalAudioCompleted(false);
  }, [activeSession?.id]);

  const onPracticeChunkPlan = useCallback((chunks: BrowserTtsPracticeChunkDefinition[], startWordIndex: number) => {
    const samePlan = definitionsRef.current.length === chunks.length && definitionsRef.current.every(
      (chunk, index) => chunk.id === chunks[index]?.id,
    );
    if (samePlan) return;

    definitionsRef.current = chunks;
    setDefinitions(chunks);
    const startIndex = Math.max(
      completedRef.current.length,
      chunks.find((chunk) =>
        startWordIndex >= chunk.startWordIndex &&
        startWordIndex < chunk.startWordIndex + chunk.wordCount)?.index ?? 0,
    );
    activeIndexRef.current = Math.min(startIndex, Math.max(0, chunks.length - 1));
    setActiveIndex(activeIndexRef.current);
  }, []);

  const composeWithDraft = useCallback((visibleDraft: string, publishDraft: boolean): string => {
    draftRef.current = visibleDraft;
    if (publishDraft) setDraft(visibleDraft);
    return composeBrowserTtsPracticeText(completedRef.current, visibleDraft);
  }, []);

  const transformCommittedDraft = useCallback(
    (visibleDraft: string) => composeWithDraft(visibleDraft, true),
    [composeWithDraft],
  );
  const transformImmediateDraft = useCallback(
    (visibleDraft: string) => composeWithDraft(visibleDraft, false),
    [composeWithDraft],
  );

  const resolvePracticeChunk = useCallback((
    definition: BrowserTtsPracticeChunkDefinition,
    reason: 'submitted' | 'timeout',
  ): string => {
    const existing = completedRef.current.find((chunk) => chunk.id === definition.id);
    if (existing) return composeBrowserTtsPracticeText(completedRef.current);

    const resolution = reason === 'timeout'
      ? 'timeout'
      : draftRef.current.trim()
        ? 'submitted'
        : 'skipped';
    const entry = buildBrowserTtsPracticeChunkTelemetry({
      definition,
      typedText: draftRef.current,
      completed: completedRef.current,
      resolution,
    });
    const nextCompleted = [...completedRef.current, entry].sort((a, b) => a.index - b.index);
    const aggregateText = composeBrowserTtsPracticeText(nextCompleted);

    completedRef.current = nextCompleted;
    setCompleted(nextCompleted);
    draftRef.current = '';
    setDraft('');
    setQueuedIndex(null);
    practiceChunkAdvanceRequestRef.current = null;
    const nextIndex = Math.min(definition.index + 1, definitionsRef.current.length);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    const nextTelemetry = cloneTelemetry(telemetryRef.current);
    nextTelemetry.practiceChunks = nextCompleted;
    telemetryRef.current = nextTelemetry;
    ttsPracticeLiveTextRef.current = aggregateText;
    setTtsPracticeText(aggregateText);

    if (definition.isFinal && reason === 'submitted') {
      finishSessionRef.current(aggregateText);
    }
    return aggregateText;
  }, [setTtsPracticeText, telemetryRef, ttsPracticeLiveTextRef]);

  const onPracticeChunkResolved = useCallback((
    definition: BrowserTtsPracticeChunkDefinition,
    reason: 'submitted' | 'timeout',
  ) => {
    resolvePracticeChunk(definition, reason);
  }, [resolvePracticeChunk]);

  const onFinalPracticeChunkAudioCompleted = useCallback((definition: BrowserTtsPracticeChunkDefinition) => {
    if (!definition.isFinal) return;
    finalAudioCompletedRef.current = true;
    setFinalAudioCompleted(true);
  }, []);

  const requestCurrentChunkAdvance = useCallback((latestDraft: string) => {
    const definition = definitionsRef.current[activeIndexRef.current];
    if (!definition || activeSessionFinished) return;
    draftRef.current = latestDraft;
    setDraft(latestDraft);
    const aggregateText = composeBrowserTtsPracticeText(completedRef.current, latestDraft);
    ttsPracticeLiveTextRef.current = aggregateText;
    setTtsPracticeText(aggregateText);

    if (definition.isFinal && finalAudioCompletedRef.current) {
      resolvePracticeChunk(definition, 'submitted');
      return;
    }

    practiceChunkAdvanceRequestRef.current = definition.index;
    setQueuedIndex(definition.index);
  }, [activeSessionFinished, resolvePracticeChunk, setTtsPracticeText, ttsPracticeLiveTextRef]);

  const resetPracticeChunks = useCallback(() => {
    definitionsRef.current = [];
    completedRef.current = [];
    activeIndexRef.current = 0;
    draftRef.current = '';
    finalAudioCompletedRef.current = false;
    practiceChunkAdvanceRequestRef.current = null;
    setDefinitions([]);
    setCompleted([]);
    setActiveIndex(0);
    setDraft('');
    setQueuedIndex(null);
    setFinalAudioCompleted(false);
    const nextTelemetry = cloneTelemetry(telemetryRef.current);
    delete nextTelemetry.practiceChunks;
    telemetryRef.current = nextTelemetry;
  }, [telemetryRef]);

  const completedViews: BrowserTtsPracticeChunkView[] = completed.map((entry) => ({
    ...(definitions[entry.index] ?? fallbackDefinition(entry)),
    typedText: entry.typedText,
    resolution: entry.resolution,
  }));
  const activeDefinition = definitions[activeIndex] ?? null;

  return {
    enabled: !activeSessionFinished && definitions.length > 0 && Boolean(activeDefinition),
    completedChunks: completedViews,
    activeChunk: activeDefinition ? { ...activeDefinition, typedText: draft } : null,
    activeDraft: draft,
    actionQueued: queuedIndex === activeDefinition?.index,
    finalAudioCompleted,
    practiceChunkAdvanceRequestRef,
    finishSessionRef,
    onPracticeChunkPlan,
    onPracticeChunkResolved,
    onFinalPracticeChunkAudioCompleted,
    transformCommittedDraft,
    transformImmediateDraft,
    requestCurrentChunkAdvance,
    resetPracticeChunks,
  };
}

function normalizeRestoredPracticeChunks(
  chunks: BrowserTtsPracticeChunkTelemetry[] | undefined,
): BrowserTtsPracticeChunkTelemetry[] {
  return [...(chunks ?? [])].sort((a, b) => a.index - b.index);
}

function fallbackDefinition(entry: BrowserTtsPracticeChunkTelemetry): BrowserTtsPracticeChunkDefinition {
  return {
    id: entry.id,
    index: entry.index,
    startWordIndex: entry.startWordIndex,
    wordCount: entry.wordCount,
    firstSemanticPhraseIndex: entry.index,
    lastSemanticPhraseIndex: entry.index,
    isFinal: false,
  };
}
