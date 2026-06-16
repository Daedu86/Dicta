import type { AdaptiveSessionFeedback, AdaptiveTimelinePoint, PhrasePlaybackEvent } from './types';
import type { TimelinePlaybackDiagnostics } from './sessionFeedbackContracts';

export function derivePlaybackDiagnosticsFromTimeline(
  timeline: AdaptiveTimelinePoint[],
): TimelinePlaybackDiagnostics {
  const points = [...timeline]
    .filter((point) => typeof point.phraseIndex === 'number')
    .sort((a, b) => a.timestampMs - b.timestampMs);
  const replayCountsByIndex = new Map<number, { phraseId?: string; repeatCount: number }>();
  let replayCount = 0;
  let deferPauseCount = 0;
  let phraseIndexJumpCount = 0;
  let lastPhraseIndex: number | null = null;

  for (const point of points) {
    if (point.event === 'replay') {
      replayCount += 1;
      const phraseIndex = point.phraseIndex ?? -1;
      const current = replayCountsByIndex.get(phraseIndex) ?? { phraseId: point.phraseId, repeatCount: 0 };
      replayCountsByIndex.set(phraseIndex, {
        phraseId: current.phraseId ?? point.phraseId,
        repeatCount: current.repeatCount + 1,
      });
    }
    if (point.event === 'defer_pause') {
      deferPauseCount += 1;
    }
    if (point.event === 'phrase_advance' && typeof point.phraseIndex === 'number') {
      if (lastPhraseIndex !== null && point.phraseIndex > lastPhraseIndex + 1) {
        phraseIndexJumpCount += 1;
      }
      lastPhraseIndex = point.phraseIndex;
    }
  }

  const repeatedPhraseIndices = [...replayCountsByIndex.entries()]
    .map(([phraseIndex, entry]) => ({
      phraseIndex,
      phraseId: entry.phraseId,
      repeatCount: entry.repeatCount,
    }))
    .filter((entry) => entry.repeatCount > 0)
    .sort((a, b) => b.repeatCount - a.repeatCount);

  return {
    source: 'timeline_fallback',
    repeatedPhraseIndices,
    repeatedPhraseCount: repeatedPhraseIndices.reduce((sum, entry) => sum + entry.repeatCount, 0),
    maxRepeatCountForSinglePhrase: repeatedPhraseIndices.reduce((max, entry) => Math.max(max, entry.repeatCount), 0),
    replayCount,
    deferPauseCount,
    phraseIndexJumpCount,
    repeatedPhrasePreviews: repeatedPhraseIndices.map((entry) =>
      entry.phraseId ? `${entry.phraseId} / index ${entry.phraseIndex}` : `index ${entry.phraseIndex}`,
    ),
  };
}

export function detectPlaybackIssues(events: PhrasePlaybackEvent[]): AdaptiveSessionFeedback['playbackIssues'] {
  // Guardrail: phraseIndex is the canonical playback position.
  // phraseId is opaque metadata and must not drive ordering/jump logic.
  const startsByIndex = new Map<number, PhrasePlaybackEvent[]>();
  const startedByIndex = new Map<number, PhrasePlaybackEvent>();
  const skippedPhrases: AdaptiveSessionFeedback['playbackIssues']['skippedPhrases'] = [];
  let outOfOrderAdvanceCount = 0;
  let replayAdvancedPhraseCount = 0;
  let phraseIndexJumpCount = 0;
  let lastStartedIndex: number | null = null;
  let lastReplayIndex: number | null = null;

  for (const event of events) {
    if (event.event === 'phrase_started') {
      startsByIndex.set(event.phraseIndex, [...(startsByIndex.get(event.phraseIndex) ?? []), event]);
      startedByIndex.set(event.phraseIndex, event);
      if (lastStartedIndex !== null) {
        if (event.phraseIndex > lastStartedIndex + 1) {
          phraseIndexJumpCount += 1;
          for (let index = lastStartedIndex + 1; index < event.phraseIndex; index += 1) {
            skippedPhrases.push({
              phraseId: `index-${index}`,
              textPreview: startedByIndex.get(index)?.textPreview ?? '',
              expectedIndex: index,
            });
          }
        }
        if (event.phraseIndex < lastStartedIndex) {
          outOfOrderAdvanceCount += 1;
        }
      }
      if (lastReplayIndex !== null && event.phraseIndex !== lastReplayIndex) {
        replayAdvancedPhraseCount += 1;
      }
      lastStartedIndex = event.phraseIndex;
      lastReplayIndex = null;
    }

    if (event.event === 'phrase_replayed') {
      lastReplayIndex = event.phraseIndex;
    }

    if (event.event === 'phrase_advanced' && lastStartedIndex !== null && event.phraseIndex !== lastStartedIndex + 1) {
      outOfOrderAdvanceCount += 1;
    }
  }

  const repeatedPhrases = [...startsByIndex.entries()]
    .map(([phraseIndex, starts]) => ({
      phraseId: starts[0]?.phraseId ?? `index-${phraseIndex}`,
      textPreview: starts[0]?.textPreview ?? '',
      repeatCount: Math.max(0, starts.length - 1),
      timestampsMs: starts.map((event) => event.timestampMs),
    }))
    .filter((entry) => entry.repeatCount > 0)
    .sort((a, b) => b.repeatCount - a.repeatCount);

  return {
    repeatedPhraseCount: repeatedPhrases.reduce((sum, entry) => sum + entry.repeatCount, 0),
    maxRepeatCountForSinglePhrase: repeatedPhrases.reduce((max, entry) => Math.max(max, entry.repeatCount), 0),
    repeatedPhrases,
    skippedPhraseCount: skippedPhrases.length,
    skippedPhrases,
    outOfOrderAdvanceCount,
    replayAdvancedPhraseCount,
    phraseIndexJumpCount,
  };
}

export function buildPhraseStats(events: PhrasePlaybackEvent[], totalPhrases?: number): AdaptiveSessionFeedback['phraseStats'] {
  const completed = new Set(events.filter((event) => event.event === 'phrase_completed').map((event) => event.phraseId));
  const replayCount = events.filter((event) => event.event === 'phrase_replayed').length;
  const phraseAdvanceCount = events.filter((event) => event.event === 'phrase_advanced').length;
  const starts = events.filter((event) => event.event === 'phrase_started').length;
  const uniqueStarted = new Set(events.filter((event) => event.event === 'phrase_started').map((event) => event.phraseId)).size;
  return {
    totalPhrases: totalPhrases ?? uniqueStarted,
    completedPhrases: completed.size,
    replayCount,
    phraseAdvanceCount,
    averageRepeatsPerPhrase: uniqueStarted > 0 ? Math.max(0, starts - uniqueStarted) / uniqueStarted : 0,
  };
}
