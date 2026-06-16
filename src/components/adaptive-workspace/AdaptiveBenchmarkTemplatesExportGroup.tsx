import { AdaptiveBenchmarkExportButton } from './AdaptiveBenchmarkExportButton';
import type { AdaptiveBenchmarkExportSectionProps } from './AdaptiveBenchmarkExportPanelTypes';

export function AdaptiveBenchmarkTemplatesExportGroup({
  profile,
  exportPayloads,
  setExportStatusMessage,
  copyToClipboard,
  formatPromptSizeHint,
  onCopyScriptPrompt,
  onCopyScriptTemplate,
}: Pick<
  AdaptiveBenchmarkExportSectionProps,
  | 'profile'
  | 'exportPayloads'
  | 'setExportStatusMessage'
  | 'copyToClipboard'
  | 'formatPromptSizeHint'
  | 'onCopyScriptPrompt'
  | 'onCopyScriptTemplate'
>) {
  return (
    <div>
      <p className="dashboard-eyebrow">Templates</p>
      <div className="admin-actions">
        <AdaptiveBenchmarkExportButton
          onClick={() => {
            onCopyScriptPrompt(profile);
            setExportStatusMessage(`Copied: Base prompt · ${profile.inputMode}/${profile.language}`);
          }}
          title={`Copy the base prompt template (no benchmark/session feedback).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
        >
          Copy base prompt
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => {
            void copyToClipboard('Base prompt', exportPayloads.llmPrompt);
          }}
          title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
        >
          Prompt
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          onClick={() => {
            onCopyScriptTemplate(profile);
            setExportStatusMessage(`Copied: Output template · ${profile.inputMode}/${profile.language}`);
          }}
          title={`Copy the output JSON template expected for generated scripts.\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
        >
          Copy output template
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => {
            void copyToClipboard('Output template', exportPayloads.outputTemplate);
          }}
          title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
        >
          Template
        </AdaptiveBenchmarkExportButton>
      </div>
    </div>
  );
}
