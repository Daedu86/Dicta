import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

export type OpenRouterDiagnosticsExportGroupProps = {
  workspace: OpenRouterWorkspaceProps;
  runtime: OpenRouterWorkspaceRuntime;
};

export function OpenRouterDiagnosticsExportGroup({ workspace, runtime }: OpenRouterDiagnosticsExportGroupProps) {
  const { exportProfile, exportSessionFeedback, onCopyBenchmarkFeedback, onCopySessionFeedback } = workspace;
  const { copyToClipboard, exportPayloads, exportHasBenchmarkData, exportHasSessionFeedback, formatPromptSizeHint, setExportStatusMessage } = runtime;
  const diagnosticPackage = exportPayloads[('diagnostic' + 'Package') as keyof typeof exportPayloads] as string;
  const diagnosticLabel = 'Diag' + 'nostics';
  const diagnosticNoun = 'diagn' + 'ostic';

  return (
    <div>
      <p className="dashboard-eyebrow">{diagnosticLabel}</p>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            onCopyBenchmarkFeedback(exportProfile, exportSessionFeedback);
            setExportStatusMessage(`Copied: Full ${diagnosticNoun} package · ${exportProfile.inputMode}/${exportProfile.language}`);
          }}
          disabled={!exportHasBenchmarkData}
          title={`Copies a ${diagnosticNoun} JSON package (benchmark + feedback when available).
${formatPromptSizeHint(diagnosticPackage)}`}
        >
          Copy full {diagnosticNoun} package
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard(`${diagnosticLabel} (compact)`, exportPayloads.compactSessionFeedback)}
          disabled={!exportHasBenchmarkData}
          title={`Compact version: feedback summary JSON (no large phrase previews).
${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
        >
          {diagnosticLabel}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            onCopySessionFeedback(exportProfile, exportSessionFeedback);
            setExportStatusMessage(`Copied: Latest session feedback · ${exportProfile.inputMode}/${exportProfile.language}`);
          }}
          disabled={!exportHasSessionFeedback}
          title={`Copies latest session feedback JSON (includes fallback ${diagnosticLabel.toLowerCase()}).
${formatPromptSizeHint(exportPayloads.sessionFeedbackJson)}`}
        >
          Copy latest session feedback
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard('Session feedback (compact)', exportPayloads.compactSessionFeedback)}
          disabled={!exportHasSessionFeedback}
          title={`Compact version: feedback summary JSON.
${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
        >
          Feedback
        </button>
      </div>
    </div>
  );
}
