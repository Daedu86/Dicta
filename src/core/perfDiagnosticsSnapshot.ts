import type {
  PerfDiagnosticsSnapshot,
  PerfInputEvent,
  PerfLongTask,
  PerfSlowSpan,
  PerfTtsUtterance,
  PerfTtsVoice,
} from './perfDiagnosticsTypes';
import {
  getHeapSnapshot,
  roundMs,
  summarizeMetric,
  summarizeVoiceCounts,
} from './perfDiagnosticsUtils';

type BuildPerfDiagnosticsSnapshotArgs = {
  enabled: boolean;
  inputEvents: PerfInputEvent[];
  longTasks: PerfLongTask[];
  slowSpans: PerfSlowSpan[];
  ttsUtterances: PerfTtsUtterance[];
  ttsVoices: PerfTtsVoice[];
  renderCounts: Record<string, number>;
};

export function buildPerfDiagnosticsSnapshot({
  enabled,
  inputEvents,
  longTasks,
  slowSpans,
  ttsUtterances,
  ttsVoices,
  renderCounts,
}: BuildPerfDiagnosticsSnapshotArgs): PerfDiagnosticsSnapshot {
  const latestInput = inputEvents[inputEvents.length - 1];
  const latestLongTask = longTasks[longTasks.length - 1];
  const latestSlowSpan = slowSpans[slowSpans.length - 1];
  const latestTts = ttsUtterances[ttsUtterances.length - 1];

  return {
    enabled,
    generatedAt: new Date().toISOString(),
    input: {
      keydownToInput: summarizeMetric(inputEvents.map((event) => event.keydownToInputMs)),
      inputToPaint: summarizeMetric(inputEvents.map((event) => event.inputToPaintMs)),
      inputToCommit: summarizeMetric(inputEvents.map((event) => event.inputToCommitMs)),
      latest: latestInput,
    },
    longTasks: {
      count: longTasks.length,
      maxDurationMs: roundMs(Math.max(0, ...longTasks.map((task) => task.duration))),
      latest: latestLongTask,
    },
    slowSpans: {
      count: slowSpans.length,
      latest: latestSlowSpan,
    },
    tts: {
      latest: latestTts,
      voices: [...ttsVoices],
      voiceCounts: summarizeVoiceCounts(ttsVoices),
    },
    renders: { ...renderCounts },
    heap: getHeapSnapshot(),
  };
}
