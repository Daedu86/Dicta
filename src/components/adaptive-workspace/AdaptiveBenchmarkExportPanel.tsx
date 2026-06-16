import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import type { useAdaptiveBenchmarkCockpitRuntime } from './useAdaptiveBenchmarkCockpitRuntime';

type AdaptiveBenchmarkExportPayloads = NonNullable<ReturnType<typeof useAdaptiveBenchmarkCockpitRuntime>['exportPayloads']>;

type AdaptiveBenchmarkExportPanelProps = {
  profile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  exportPanelOpen: boolean;
  setExportPanelOpen: (value: boolean) => void;
  exportPayloads: AdaptiveBenchmarkExportPayloads | null;
  hasBenchmarkData: boolean;
  hasSessionFeedback: boolean;
  humanFeedbackEditorOpen: boolean;
  setHumanFeedbackEditorOpen: (value: boolean) => void;
  humanFeedbackDraft: string;
  setHumanFeedbackDraft: (value: string) => void;
  setExportStatusMessage: (message: string) => void;
  copyToClipboard: (label: string, text: string) => Promise<void>;
  formatPromptSizeHint: (value: string) => string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
};

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
          <div className="adaptive-export-groups">
            <div>
              <p className="dashboard-eyebrow">Benchmark JSON</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onCopyBenchmark(profile)}
                  title={`Copy the selected benchmark profile JSON to your clipboard (KPIs, recommendation, weak areas, and recent timeline points).\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
                >
                  Copy Benchmark JSON
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
                  title={`Compact version: benchmark summary only (no timeline / large arrays).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onExportBenchmark(profile)}
                  title={`Download the selected benchmark profile JSON as a .json file (same content as Copy Benchmark JSON).\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
                >
                  Export Benchmark JSON
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
                  title={`Compact version: copies benchmark summary JSON (clipboard).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                >
                  Export
                </button>
              </div>
            </div>
            <div>
              <p className="dashboard-eyebrow">Primary</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button adaptive-recommended-action"
                  onClick={() => {
                    onCopyBenchmarkFeedbackPrompt(profile, sessionFeedback);
                    setExportStatusMessage(`Copied: Next adaptive script prompt · ${profile.inputMode}/${profile.language}`);
                  }}
                  disabled={!hasBenchmarkData || !hasSessionFeedback}
                  title={`Copy a ready-to-use prompt package for the next adaptive script (includes benchmark + latest session feedback). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.promptPackage)}`}
                >
                  Copy next adaptive script prompt
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button adaptive-recommended-action"
                  onClick={() => {
                    void copyToClipboard('Next adaptive script prompt (compact)', exportPayloads.compactPromptPackage);
                  }}
                  disabled={!hasBenchmarkData || !hasSessionFeedback}
                  title={`Compact version: JSON package (benchmark summary + feedback summary + base prompt). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.compactPromptPackage)}`}
                >
                  Copy prompt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setHumanFeedbackEditorOpen(true)}
                  disabled={!hasBenchmarkData || !hasSessionFeedback}
                  title={`Add your notes, then copy a prompt package for generating the next script (includes your notes).\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                >
                  Copy prompt with my notes
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => setHumanFeedbackEditorOpen(true)}
                  disabled={!hasBenchmarkData || !hasSessionFeedback}
                  title={`Compact version: open notes editor.\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                >
                  Notes prompt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyBenchmarkWithScriptPrompt(profile);
                    setExportStatusMessage(`Copied: Benchmark-only script prompt · ${profile.inputMode}/${profile.language}`);
                  }}
                  disabled={!hasBenchmarkData}
                  title={`Copy a prompt package that uses only benchmark data (no latest session feedback required). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.benchmarkOnlyPackage)}`}
                >
                  Copy benchmark-only prompt
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Benchmark-only prompt context (compact)', exportPayloads.compactBenchmark);
                  }}
                  disabled={!hasBenchmarkData}
                  title={`Compact version: copies benchmark summary only.\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                >
                  Copy benchmark
                </button>
              </div>
              {!hasBenchmarkData ? <p className="hint">No benchmark available for this profile yet.</p> : null}
              {!hasSessionFeedback ? <p className="hint">No completed session feedback for this profile yet.</p> : null}
            </div>
            <div>
              <p className="dashboard-eyebrow">Diagnostics</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyBenchmarkFeedback(profile, sessionFeedback);
                    setExportStatusMessage(`Copied: Full diagnostic package · ${profile.inputMode}/${profile.language}`);
                  }}
                  disabled={!hasBenchmarkData}
                  title={`Copy a full diagnostic package (benchmark + session feedback when available) for debugging playback/quality issues.\n${formatPromptSizeHint(exportPayloads.diagnosticPackage)}`}
                >
                  Copy full diagnostic package
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Diagnostics (compact)', exportPayloads.compactSessionFeedback);
                  }}
                  disabled={!hasBenchmarkData}
                  title={`Compact version: feedback summary JSON (no large phrase previews).\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
                >
                  Diagnostics
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopySessionFeedback(profile, sessionFeedback);
                    setExportStatusMessage(`Copied: Latest session feedback · ${profile.inputMode}/${profile.language}`);
                  }}
                  disabled={!hasSessionFeedback}
                  title={`Copy the latest session feedback JSON to your clipboard (verdict, deltas, and playback issues).\n${formatPromptSizeHint(exportPayloads.sessionFeedbackJson)}`}
                >
                  Copy latest session feedback
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Session feedback (compact)', exportPayloads.compactSessionFeedback);
                  }}
                  disabled={!hasSessionFeedback}
                  title={`Compact version: feedback summary JSON.\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
                >
                  Feedback
                </button>
              </div>
            </div>
            <div>
              <p className="dashboard-eyebrow">Templates</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyScriptPrompt(profile);
                    setExportStatusMessage(`Copied: Base prompt · ${profile.inputMode}/${profile.language}`);
                  }}
                  title={`Copy the base prompt template (no benchmark/session feedback).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
                >
                  Copy base prompt
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Base prompt', exportPayloads.llmPrompt);
                  }}
                  title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
                >
                  Prompt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyScriptTemplate(profile);
                    setExportStatusMessage(`Copied: Output template · ${profile.inputMode}/${profile.language}`);
                  }}
                  title={`Copy the output JSON template expected for generated scripts.\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
                >
                  Copy output template
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Output template', exportPayloads.outputTemplate);
                  }}
                  title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
                >
                  Template
                </button>
              </div>
            </div>
          </div>
          {humanFeedbackEditorOpen ? (
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
          ) : null}
        </>
      ) : null}
    </details>
  );
}
