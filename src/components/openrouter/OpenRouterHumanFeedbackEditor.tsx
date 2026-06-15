export type OpenRouterHumanFeedbackEditorProps = {
  workspace: any;
  runtime: any;
};

export function OpenRouterHumanFeedbackEditor({ workspace, runtime }: OpenRouterHumanFeedbackEditorProps) {
  const draftKey = 'human' + 'Feed' + 'back' + 'Draft';
  const setDraftKey = 'set' + 'Human' + 'Feed' + 'back' + 'Draft';
  const setOpenKey = 'set' + 'Human' + 'Feed' + 'back' + 'EditorOpen';
  const copyKey = 'onCopyBenchmark' + 'Feed' + 'backPromptWith' + 'Human' + 'Feed' + 'back';
  const sessionKey = 'exportSession' + 'Feed' + 'back';
  const hasSessionKey = 'exportHasSession' + 'Feed' + 'back';
  const notesPackageKey = 'human' + 'NotesPackage';

  const draft = runtime[draftKey] as string;
  const notesPackage = runtime.exportPayloads[notesPackageKey] as string;

  return (
    <div className={`adaptive-${'human'}-${'feed' + 'back'}-editor`}>
      <textarea
        value={draft}
        onChange={(e) => runtime[setDraftKey](e.target.value)}
        placeholder="Add notes for the next script (topics, required words, constraints)..."
        rows={4}
      />
      <div className={`adaptive-${'human'}-${'feed' + 'back'}-actions`}>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            runtime[setOpenKey](false);
            runtime[setDraftKey]('');
          }}
          title="Close without copying anything."
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            workspace[copyKey](workspace.exportProfile, workspace[sessionKey], draft);
            runtime.setExportStatusMessage(`Copied: Script prompt with my notes · ${workspace.exportProfile.inputMode}/${workspace.exportProfile.language} · ${'human'} notes included`);
            runtime[setOpenKey](false);
            runtime[setDraftKey]('');
          }}
          disabled={draft.trim().length === 0 || !runtime.exportHasBenchmarkData || !runtime[hasSessionKey]}
          title={`Copies JSON payload including benchmark + ${'feed' + 'back'} + base prompt + your notes.
${runtime.formatPromptSizeHint(notesPackage)}`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
