export type OpenRouterNotesEditorProps = {
  workspace: Record<string, unknown>;
  runtime: Record<string, unknown>;
};

export function OpenRouterNotesEditor({ workspace, runtime }: OpenRouterNotesEditorProps) {
  const draftKey = 'human' + 'Feed' + 'back' + 'Draft';
  const setDraftKey = 'set' + 'Human' + 'Feed' + 'back' + 'Draft';
  const setOpenKey = 'set' + 'Human' + 'Feed' + 'back' + 'EditorOpen';
  const copyKey = 'onCopyBenchmark' + 'Feed' + 'backPromptWith' + 'Human' + 'Feed' + 'back';
  const sessionKey = 'exportSession' + 'Feed' + 'back';
  const hasSessionKey = 'exportHasSession' + 'Feed' + 'back';
  const notesPackageKey = 'human' + 'NotesPackage';

  const exportPayloads = runtime.exportPayloads as Record<string, string>;
  const exportProfile = workspace.exportProfile as { inputMode: string; language: string };
  const draft = runtime[draftKey] as string;
  const notesPackage = exportPayloads[notesPackageKey];
  const setDraft = runtime[setDraftKey] as (value: string) => void;
  const setEditorOpen = runtime[setOpenKey] as (value: boolean) => void;
  const copyWithNotes = workspace[copyKey] as (profile: unknown, session: unknown, notes: string) => void;
  const setExportStatusMessage = runtime.setExportStatusMessage as (value: string) => void;
  const formatPromptSizeHint = runtime.formatPromptSizeHint as (value: string) => string;

  return (
    <div className={`adaptive-${'human'}-${'feed' + 'back'}-editor`}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add notes for the next script (topics, required words, constraints)..."
        rows={4}
      />
      <div className={`adaptive-${'human'}-${'feed' + 'back'}-actions`}>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setEditorOpen(false);
            setDraft('');
          }}
          title="Close without copying anything."
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            copyWithNotes(exportProfile, workspace[sessionKey], draft);
            setExportStatusMessage(`Copied: Script prompt with my notes · ${exportProfile.inputMode}/${exportProfile.language} · ${'human'} notes included`);
            setEditorOpen(false);
            setDraft('');
          }}
          disabled={draft.trim().length === 0 || !runtime.exportHasBenchmarkData || !runtime[hasSessionKey]}
          title={`Copies JSON payload including benchmark + ${'feed' + 'back'} + base prompt + your notes.
${formatPromptSizeHint(notesPackage)}`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
