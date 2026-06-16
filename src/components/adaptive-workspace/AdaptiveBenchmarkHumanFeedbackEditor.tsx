import type { AdaptiveBenchmarkExportPanelProps } from './AdaptiveBenchmarkExportPanelTypes';

type AdaptiveBenchmarkHumanFeedbackEditorProps = Pick<
  AdaptiveBenchmarkExportPanelProps,
  | 'profile'
  | 'sessionFeedback'
  | 'exportPayloads'
  | 'hasBenchmarkData'
  | 'hasSessionFeedback'
  | 'humanFeedbackDraft'
  | 'setHumanFeedbackDraft'
  | 'setHumanFeedbackEditorOpen'
  | 'setExportStatusMessage'
  | 'formatPromptSizeHint'
  | 'onCopyBenchmarkFeedbackPromptWithHumanFeedback'
> & {
  exportPayloads: NonNullable<AdaptiveBenchmarkExportPanelProps['exportPayloads']>;
};

export function AdaptiveBenchmarkHumanFeedbackEditor({
  profile,
  sessionFeedback,
  exportPayloads,
  hasBenchmarkData,
  hasSessionFeedback,
  humanFeedbackDraft,
  setHumanFeedbackDraft,
  setHumanFeedbackEditorOpen,
  setExportStatusMessage,
  formatPromptSizeHint,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: AdaptiveBenchmarkHumanFeedbackEditorProps) {
  return (
    <div id="adaptive-human-feedback" className="adaptive-human-feedback-editor">
      <textarea
        value={humanFeedbackDraft}
        onChange={(e) => setHumanFeedbackDraft(e.target.value)}
        placeholder="Add human feedback for the next script (topics, required words, style, constraints)..."
        rows={4}
      />
      <div className="adaptive-human-feedback-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setHumanFeedbackEditorOpen(false);
            setHumanFeedbackDraft('');
          }}
          title="Close without copying anything."
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onCopyBenchmarkFeedbackPromptWithHumanFeedback(profile, sessionFeedback, humanFeedbackDraft);
            setExportStatusMessage(`Copied: Script prompt with my notes · ${profile.inputMode}/${profile.language} · human notes included`);
            setHumanFeedbackEditorOpen(false);
            setHumanFeedbackDraft('');
          }}
          disabled={humanFeedbackDraft.trim().length === 0 || !hasBenchmarkData || !hasSessionFeedback}
          title={`Copy the prompt package including your notes (requires benchmark data + latest session feedback).\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
