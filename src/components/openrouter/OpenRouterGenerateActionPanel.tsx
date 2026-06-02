export type OpenRouterGenerateActionPanelProps = {
  disabled: boolean;
  requesting: boolean;
  generating: boolean;
  slotLabel: string;
  model: string | null | undefined;
  onGenerate: () => void;
};

export function OpenRouterGenerateActionPanel({
  disabled,
  requesting,
  generating,
  slotLabel,
  model,
  onGenerate,
}: OpenRouterGenerateActionPanelProps) {
  return (
    <div className="admin-actions">
      <button type="button" className="secondary-button" disabled={disabled} onClick={onGenerate}>
        {requesting ? 'Requesting...' : generating ? 'Generating...' : `Generate ${slotLabel}`}
      </button>
      <span className="hint">{model ? `Using: ${model}` : 'Set a default model first (Section #2).'}</span>
    </div>
  );
}
