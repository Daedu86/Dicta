export type OpenRouterGenerationUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type OpenRouterGenerationJobNotice = {
  message: string;
  tone: 'error' | 'success' | 'hint' | string;
};

export type OpenRouterGenerationStatusPanelProps = {
  slotLabel: string;
  jobNotice: OpenRouterGenerationJobNotice | null;
  usage: OpenRouterGenerationUsage | null;
  elapsedLabel: string | null;
  generatedAtLabel: string | null;
  error: string;
  hasDraft: boolean;
  draftInputMode: string | null;
  draftLanguage: string | null;
  onClearDraft: () => void;
};

export function OpenRouterGenerationStatusPanel({
  slotLabel,
  jobNotice,
  usage,
  elapsedLabel,
  generatedAtLabel,
  error,
  hasDraft,
  draftInputMode,
  draftLanguage,
  onClearDraft,
}: OpenRouterGenerationStatusPanelProps) {
  return (
    <>
      {jobNotice ? (
        <p className={jobNotice.tone === 'error' ? 'error' : jobNotice.tone === 'success' ? 'success' : 'hint'}>
          {jobNotice.message}
        </p>
      ) : null}

      {usage ? (
        <p className="hint">
          {slotLabel} tokens: input {usage.promptTokens}, output {usage.completionTokens}, total {usage.totalTokens}.
        </p>
      ) : null}
      {elapsedLabel ? (
        <p className="success">
          {slotLabel} completed in {elapsedLabel}
          {generatedAtLabel ? ` · ${generatedAtLabel}` : ''}.
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {hasDraft ? (
        <div className="admin-actions">
          <span className="hint">
            {slotLabel} draft kept until create or cancel
            {draftInputMode && draftLanguage ? ` · ${draftInputMode}/${draftLanguage}` : ''}.
          </span>
          <button type="button" className="secondary-button" onClick={onClearDraft}>
            Cancel {slotLabel}
          </button>
        </div>
      ) : null}
    </>
  );
}
