import { AdaptiveBenchmarkExportButton } from './AdaptiveBenchmarkExportButton';
import type { AdaptiveBenchmarkExportSectionProps } from './AdaptiveBenchmarkExportPanelTypes';

export function AdaptiveBenchmarkPrimaryExportGroup({
  profile,
  sessionFeedback,
  exportPayloads,
  hasBenchmarkData,
  hasSessionFeedback,
  setHumanFeedbackEditorOpen,
  setExportStatusMessage,
  copyToClipboard,
  formatPromptSizeHint,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkWithScriptPrompt,
}: Pick<
  AdaptiveBenchmarkExportSectionProps,
  | 'profile'
  | 'sessionFeedback'
  | 'exportPayloads'
  | 'hasBenchmarkData'
  | 'hasSessionFeedback'
  | 'setHumanFeedbackEditorOpen'
  | 'setExportStatusMessage'
  | 'copyToClipboard'
  | 'formatPromptSizeHint'
  | 'onCopyBenchmarkFeedbackPrompt'
  | 'onCopyBenchmarkWithScriptPrompt'
>) {
  return (
    <div>
      <p className="dashboard-eyebrow">Primary</p>
      <div className="admin-actions">
        <AdaptiveBenchmarkExportButton
          recommended
          onClick={() => {
            onCopyBenchmarkFeedbackPrompt(profile, sessionFeedback);
            setExportStatusMessage(`Copied: Next adaptive script prompt · ${profile.inputMode}/${profile.language}`);
          }}
          disabled={!hasBenchmarkData || !hasSessionFeedback}
          title={`Copy a ready-to-use prompt package for the next adaptive script (includes benchmark + latest session feedback). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.promptPackage)}`}
        >
          Copy next adaptive script prompt
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          recommended
          onClick={() => {
            void copyToClipboard('Next adaptive script prompt (compact)', exportPayloads.compactPromptPackage);
          }}
          disabled={!hasBenchmarkData || !hasSessionFeedback}
          title={`Compact version: JSON package (benchmark summary + feedback summary + base prompt). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.compactPromptPackage)}`}
        >
          Copy prompt
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          onClick={() => setHumanFeedbackEditorOpen(true)}
          disabled={!hasBenchmarkData || !hasSessionFeedback}
          title={`Add your notes, then copy a prompt package for generating the next script (includes your notes).\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
        >
          Copy prompt with my notes
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => setHumanFeedbackEditorOpen(true)}
          disabled={!hasBenchmarkData || !hasSessionFeedback}
          title={`Compact version: open notes editor.\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
        >
          Notes prompt
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          onClick={() => {
            onCopyBenchmarkWithScriptPrompt(profile);
            setExportStatusMessage(`Copied: Benchmark-only script prompt · ${profile.inputMode}/${profile.language}`);
          }}
          disabled={!hasBenchmarkData}
          title={`Copy a prompt package that uses only benchmark data (no latest session feedback required). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.benchmarkOnlyPackage)}`}
        >
          Copy benchmark-only prompt
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => {
            void copyToClipboard('Benchmark-only prompt context (compact)', exportPayloads.compactBenchmark);
          }}
          disabled={!hasBenchmarkData}
          title={`Compact version: copies benchmark summary only.\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
        >
          Copy benchmark
        </AdaptiveBenchmarkExportButton>
      </div>
      {!hasBenchmarkData ? <p className="hint">No benchmark available for this profile yet.</p> : null}
      {!hasSessionFeedback ? <p className="hint">No completed session feedback for this profile yet.</p> : null}
    </div>
  );
}
