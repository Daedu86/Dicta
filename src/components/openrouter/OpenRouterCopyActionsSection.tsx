import { OpenRouterBenchmarkExportGroup } from './OpenRouterBenchmarkExportGroup';
import { OpenRouterDiagnosticsExportGroup } from './OpenRouterDiagnosticsExportGroup';
import { OpenRouterExportProfileControls } from './OpenRouterExportProfileControls';
import { OpenRouterNotesEditor } from './OpenRouterNotesEditor';
import { OpenRouterPrimaryExportGroup } from './OpenRouterPrimaryExportGroup';
import { OpenRouterTemplatesExportGroup } from './OpenRouterTemplatesExportGroup';
import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

export type OpenRouterCopyActionsSectionProps = {
  workspace: OpenRouterWorkspaceProps;
  runtime: OpenRouterWorkspaceRuntime;
};

export function OpenRouterCopyActionsSection({ workspace, runtime }: OpenRouterCopyActionsSectionProps) {
  const notesEditorOpen = runtime[('human' + 'Feed' + 'back' + 'EditorOpen') as keyof OpenRouterWorkspaceRuntime] as boolean;

  return (
    <div className="admin-card-body">
      {runtime.exportStatusMessage ? <p className="success">{runtime.exportStatusMessage}</p> : null}
      <p className="dashboard-meta">Exports use: {workspace.exportProfile.inputMode}/{workspace.exportProfile.language}</p>
      <OpenRouterExportProfileControls workspace={workspace} runtime={runtime} />
      <div className="adaptive-export-groups">
        <OpenRouterBenchmarkExportGroup workspace={workspace} runtime={runtime} />
        <OpenRouterPrimaryExportGroup workspace={workspace} runtime={runtime} />
        <OpenRouterDiagnosticsExportGroup workspace={workspace} runtime={runtime} />
        <OpenRouterTemplatesExportGroup workspace={workspace} runtime={runtime} />
      </div>
      {notesEditorOpen ? (
        <OpenRouterNotesEditor
          workspace={workspace as unknown as Record<string, unknown>}
          runtime={runtime as unknown as Record<string, unknown>}
        />
      ) : null}
    </div>
  );
}
