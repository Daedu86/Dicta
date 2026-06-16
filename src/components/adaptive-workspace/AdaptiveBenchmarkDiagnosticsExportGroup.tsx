import { AdaptiveBenchmarkExportButton } from './AdaptiveBenchmarkExportButton';
import type { AdaptiveBenchmarkExportSectionProps } from './AdaptiveBenchmarkExportPanelTypes';

export function AdaptiveBenchmarkDiagnosticsExportGroup({
  profile,
  sessionFeedback,
  exportPayloads,
  hasBenchmarkData,
  hasSessionFeedback,
  setExportStatusMessage,
  copyToClipboard,
  formatPromptSizeHint,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
}: Pick<
  AdaptiveBenchmarkExportSectionProps,
  | 'profile'
  | 'sessionFeedback'
  | 'exportPayloads'
  | 'hasBenchmarkData'
  | 'hasSessionFeedback'
  | 'setExportStatusMessage'
  | 'copyToClipboard'
  | 'formatPromptSizeHint'
  | 'onCopySessionFeedback'
  | 'onCopyBenchmarkFeedback'
>) {
  return (
    <div>
      <p className="dashboard-eyebrow">Diagnostics</p>
      <div className="admin-actions">
        <AdaptiveBenchmarkExportButton
          onClick={() => {
            onCopyBenchmarkFeedback(profile, sessionFeedback);
            setExportStatusMessage(`Copied: Full diagnostic package · ${profile.inputMode}/${profile.language}`);
          }}
          disabled={!hasBenchmarkData}
          title={`Copy a full diagnostic package (benchmark + session feedback when available) for debugging playback/quality issues.\n${formatPromptSizeHint(exportPayloads.diagnosticPackage)}`}
        >
          Copy full diagnostic package
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => {
            void copyToClipboard('Diagnostics (compact)', exportPayloads.compactSessionFeedback);
          }}
          disabled={!hasBenchmarkData}
          title={`Compact version: feedback summary JSON (no large phrase previews).\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
        >
          Diagnostics
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          onClick={() => {
            onCopySessionFeedback(profile, sessionFeedback);
            setExportStatusMessage(`Copied: Latest session feedback · ${profile.inputMode}/${profile.language}`);
          }}
          disabled={!hasSessionFeedback}
          title={`Copy the latest session feedback JSON to your clipboard (verdict, deltas, and playback issues).\n${formatPromptSizeHint(exportPayloads.sessionFeedbackJson)}`}
        >
          Copy latest session feedback
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => {
            void copyToClipboard('Session feedback (compact)', exportPayloads.compactSessionFeedback);
          }}
          disabled={!hasSessionFeedback}
          title={`Compact version: feedback summary JSON.\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
        >
          Feedback
        </AdaptiveBenchmarkExportButton>
      </div>
    </div>
  );
}
