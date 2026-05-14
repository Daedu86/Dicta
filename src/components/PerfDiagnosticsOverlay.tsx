import { useEffect, useState } from 'react';
import { perfDiagnostics, type PerfDiagnosticsSnapshot } from '../core/perfDiagnostics';

export function PerfDiagnosticsOverlay({ enabled }: { enabled: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<PerfDiagnosticsSnapshot | null>(() => (enabled ? perfDiagnostics.snapshot() : null));

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setSnapshot(perfDiagnostics.snapshot());
    }, 750);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled || !snapshot) return null;

  const latestInput = snapshot.input.latest;
  const latestTts = snapshot.tts.latest;
  const heapMb = snapshot.heap.usedJSHeapSize ? `${(snapshot.heap.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB` : 'n/a';

  return (
    <aside className={`perf-overlay ${expanded ? 'perf-overlay-expanded' : ''}`} aria-label="Performance diagnostics">
      <button type="button" className="perf-overlay-toggle" onClick={() => setExpanded((value) => !value)}>
        Perf {Math.round(snapshot.input.inputToPaint.latest || 0)}ms
      </button>
      {expanded ? (
        <div className="perf-overlay-body">
          <div><span>Input paint</span><strong>{formatSummary(snapshot.input.inputToPaint)}</strong></div>
          <div><span>Input commit</span><strong>{formatSummary(snapshot.input.inputToCommit)}</strong></div>
          <div><span>Long tasks</span><strong>{snapshot.longTasks.count} / {snapshot.longTasks.maxDurationMs.toFixed(0)}ms</strong></div>
          <div><span>Slow span</span><strong>{snapshot.slowSpans.latest ? `${snapshot.slowSpans.latest.name} ${snapshot.slowSpans.latest.duration.toFixed(0)}ms` : 'none'}</strong></div>
          <div><span>TTS start</span><strong>{latestTts?.playToStartMs === undefined ? 'n/a' : `${latestTts.playToStartMs.toFixed(0)}ms`}</strong></div>
          <div><span>TTS chunk</span><strong>{latestTts?.startToEndMs === undefined ? 'n/a' : `${latestTts.startToEndMs.toFixed(0)}ms`}</strong></div>
          <div><span>Textarea renders</span><strong>{snapshot.renders.LowLatencyTextarea ?? 0}</strong></div>
          <div><span>Heap</span><strong>{heapMb}</strong></div>
          <div><span>Last input</span><strong>{latestInput ? `${latestInput.valueLength} chars` : 'none'}</strong></div>
        </div>
      ) : null}
    </aside>
  );
}

function formatSummary(summary: PerfDiagnosticsSnapshot['input']['inputToPaint']): string {
  if (summary.count === 0) return 'n/a';
  return `${summary.latest.toFixed(0)}ms avg ${summary.average.toFixed(0)} max ${summary.max.toFixed(0)}`;
}
