import { AdaptiveBenchmarkExportGroups } from './AdaptiveBenchmarkExportGroups';
import { AdaptiveBenchmarkHumanFeedbackEditor } from './AdaptiveBenchmarkHumanFeedbackEditor';
import type { AdaptiveBenchmarkExportPanelProps } from './AdaptiveBenchmarkExportPanelTypes';

export function AdaptiveBenchmarkExportPanel({
  profile,
  sessionFeedback,
  exportPanelOpen,
  setExportPanelOpen,
  exportPayloads,
  hasBenchmarkData,
  hasSessionFeedback,
  humanFeedbackEditorOpen,
  setHumanFeedbackEditorOpen,
  humanFeedbackDraft,
  setHumanFeedbackDraft,
  setExportStatusMessage,
  copyToClipboard,
  formatPromptSizeHint,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyScriptPrompt,
  onCopyBenchmarkWithScriptPrompt,
  onCopyScriptTemplate,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: AdaptiveBenchmarkExportPanelProps) {
  return (
    <details
      className="adaptive-benchmark-subpanel adaptive-export-panel"
      id="adaptive-export-copy-actions"
      open={exportPanelOpen}
      onToggle={(event) => setExportPanelOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>Advanced exports</strong>
          <small>{profile.inputMode}/{profile.language}</small>
        </span>
        <em>{exportPanelOpen ? 'Hide exports' : 'Show exports'}</em>
      </summary>
      {exportPanelOpen && exportPayloads ? (
        <>
          <AdaptiveBenchmarkExportGroups
            profile={profile}
            sessionFeedback={sessionFeedback}
            exportPayloads={exportPayloads}
            hasBenchmarkData={hasBenchmarkData}
            hasSessionFeedback={hasSessionFeedback}
            setHumanFeedbackEditorOpen={setHumanFeedbackEditorOpen}
            setExportStatusMessage={setExportStatusMessage}
            copyToClipboard={copyToClipboard}
            formatPromptSizeHint={formatPromptSizeHint}
            onCopyBenchmark={onCopyBenchmark}
            onExportBenchmark={onExportBenchmark}
            onCopyScriptPrompt={onCopyScriptPrompt}
            onCopyBenchmarkWithScriptPrompt={onCopyBenchmarkWithScriptPrompt}
            onCopyScriptTemplate={onCopyScriptTemplate}
            onCopySessionFeedback={onCopySessionFeedback}
            onCopyBenchmarkFeedback={onCopyBenchmarkFeedback}
            onCopyBenchmarkFeedbackPrompt={onCopyBenchmarkFeedbackPrompt}
          />
          {humanFeedbackEditorOpen ? (
            <AdaptiveBenchmarkHumanFeedbackEditor
              profile={profile}
              sessionFeedback={sessionFeedback}
              exportPayloads={exportPayloads}
              hasBenchmarkData={hasBenchmarkData}
              hasSessionFeedback={hasSessionFeedback}
              humanFeedbackDraft={humanFeedbackDraft}
              setHumanFeedbackDraft={setHumanFeedbackDraft}
              setHumanFeedbackEditorOpen={setHumanFeedbackEditorOpen}
              setExportStatusMessage={setExportStatusMessage}
              formatPromptSizeHint={formatPromptSizeHint}
              onCopyBenchmarkFeedbackPromptWithHumanFeedback={onCopyBenchmarkFeedbackPromptWithHumanFeedback}
            />
          ) : null}
        </>
      ) : null}
    </details>
  );
}
