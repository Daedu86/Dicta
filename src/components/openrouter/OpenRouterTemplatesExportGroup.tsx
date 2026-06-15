import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

export type OpenRouterTemplatesExportGroupProps = {
  workspace: OpenRouterWorkspaceProps;
  runtime: OpenRouterWorkspaceRuntime;
};

export function OpenRouterTemplatesExportGroup({ workspace, runtime }: OpenRouterTemplatesExportGroupProps) {
  const { exportProfile, onCopyScriptPrompt, onCopyScriptTemplate } = workspace;
  const { copyToClipboard, exportPayloads, formatPromptSizeHint, setExportStatusMessage } = runtime;

  return (
    <div>
      <p className="dashboard-eyebrow">Templates</p>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            onCopyScriptPrompt(exportProfile);
            setExportStatusMessage(`Copied: Base prompt · ${exportProfile.inputMode}/${exportProfile.language}`);
          }}
          title={`Copies the base prompt template (no benchmark/session feedback).
${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
        >
          Copy base prompt
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard('Base prompt', exportPayloads.llmPrompt)}
          title={`Compact version: same content (already minimal).
${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
        >
          Prompt
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            onCopyScriptTemplate(exportProfile);
            setExportStatusMessage(`Copied: Output template · ${exportProfile.inputMode}/${exportProfile.language}`);
          }}
          title={`Copies the output JSON template expected for generated scripts.
${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
        >
          Copy output template
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard('Output template', exportPayloads.outputTemplate)}
          title={`Compact version: same content (already minimal).
${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
        >
          Template
        </button>
      </div>
    </div>
  );
}
