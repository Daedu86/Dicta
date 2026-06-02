export type OpenRouterModelOption = {
  id: string;
  name?: string;
  context_length?: number;
};

export type OpenRouterModelSelectorProps = {
  defaultModel: string;
  assignedModel: string | null;
  selectedModel: string;
  modelOptions: OpenRouterModelOption[];
  freeModelCount: number;
  modelSelectionLocked: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  onSelectModel: (value: string) => void;
  onSetDefaultModel: (value: string) => void;
  onRefreshModels: () => void | Promise<void>;
};

export function OpenRouterModelSelector({
  defaultModel,
  assignedModel,
  selectedModel,
  modelOptions,
  freeModelCount,
  modelSelectionLocked,
  status,
  error,
  onSelectModel,
  onSetDefaultModel,
  onRefreshModels,
}: OpenRouterModelSelectorProps) {
  return (
    <div className="admin-card-body">
      <div className="admin-actions">
        <button type="button" className="secondary-button" onClick={() => void onRefreshModels()} disabled={status === 'loading'}>
          {status === 'loading' ? 'Refreshing…' : 'Refresh models'}
        </button>
        <span className="hint">
          {status === 'ready' ? `${freeModelCount} free model(s) found.` : status === 'loading' ? 'Querying OpenRouter…' : ''}
        </span>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <label>
        {modelSelectionLocked ? 'Assigned model' : 'Default model'}
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          disabled={modelSelectionLocked || modelOptions.length === 0}
        >
          {modelOptions.length === 0 ? <option value="">No free models loaded</option> : null}
          {modelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}{model.context_length ? ` (${model.context_length} ctx)` : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-actions">
        <button
          type="button"
          onClick={() => onSetDefaultModel(selectedModel)}
          disabled={modelSelectionLocked || !selectedModel || modelOptions.length === 0}
        >
          Set default model
        </button>
        <span className="hint">
          {modelSelectionLocked
            ? `Assigned by admin: ${assignedModel}`
            : defaultModel
              ? `Default model set: ${defaultModel}`
              : 'No default model set yet.'}
        </span>
      </div>
      <p className="hint">
        This list is filtered to models with OpenRouter pricing `prompt=0` and `completion=0`. Availability and “free” status can change upstream.
      </p>
    </div>
  );
}
