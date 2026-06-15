import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

export type OpenRouterPrimaryExportGroupProps = {
  workspace: OpenRouterWorkspaceProps;
  runtime: OpenRouterWorkspaceRuntime;
};

export function OpenRouterPrimaryExportGroup({ workspace, runtime }: OpenRouterPrimaryExportGroupProps) {
  const { exportProfile, exportSessionFeedback, onCopyBenchmarkFeedbackPrompt, onCopyBenchmarkWithScriptPrompt } = workspace;
  const {
    copyToClipboard,
    exportPayloads,
    exportHasBenchmarkData,
    exportHasSessionFeedback,
    formatPromptSizeHint,
    setExportStatusMessage,
    setHumanFeedbackEditorOpen,
  } = runtime;

  return (
    <div>
      <p className="dashboard-eyebrow">Primary</p>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button adaptive-recommended-action"
          onClick={() => {
            onCopyBenchmarkFeedbackPrompt(exportProfile, exportSessionFeedback);
            setExportStatusMessage(`Copied: Next adaptive script prompt · ${exportProfile.inputMode}/${exportProfile.language}`);
          }}
          disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
          title={`Copies a ready-to-use prompt package (benchmark + latest session feedback). This does not generate a session.
${formatPromptSizeHint(exportPayloads.promptPackage)}`}
        >
          Copy next adaptive script prompt
        </button>
        <button
          type="button"
          className="secondary-button compact-button adaptive-recommended-action"
          onClick={() => void copyToClipboard('Next adaptive script prompt (compact)', exportPayloads.compactPromptPackage)}
          disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
          title={`Compact version: JSON package (benchmark summary + feedback summary + base prompt). This does not generate a session.
${formatPromptSizeHint(exportPayloads.compactPromptPackage)}`}
        >
          Copy prompt
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setHumanFeedbackEditorOpen(true)}
          disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
          title={`Opens a notes editor, then copies JSON payload including your notes.
${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
        >
          Copy prompt with my notes
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => setHumanFeedbackEditorOpen(true)}
          disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
          title={`Compact version: open notes editor (submit copies compact payload).
${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
        >
          Notes prompt
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            onCopyBenchmarkWithScriptPrompt(exportProfile);
            setExportStatusMessage(`Copied: Benchmark-only script prompt · ${exportProfile.inputMode}/${exportProfile.language}`);
          }}
          disabled={!exportHasBenchmarkData}
          title={`Copies benchmark JSON context + base LLM prompt. This does not generate a session.
${formatPromptSizeHint(exportPayloads.benchmarkOnlyPackage)}`}
        >
          Copy benchmark-only prompt
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard('Benchmark-only prompt context (compact)', exportPayloads.compactBenchmark)}
          disabled={!exportHasBenchmarkData}
          title={`Compact version: copies benchmark summary only.
${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
        >
          Copy benchmark
        </button>
      </div>
      {!exportHasBenchmarkData ? <p className="hint">No benchmark available for this profile yet.</p> : null}
      {!exportHasSessionFeedback ? <p className="hint">No completed session feedback for this profile yet.</p> : null}
    </div>
  );
}
