export type OllamaModelSummary = {
  id: string;
  name?: string;
  modified_at?: string;
  size?: number;
  details?: {
    parameter_size?: string;
    family?: string;
    families?: string[];
    format?: string;
    quantization_level?: string;
  };
};

export type OllamaWorkspaceProps = {
  defaultModel: string;
  authHeaders: Record<string, string>;
  models: OllamaModelSummary[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  onSetDefaultModel: (value: string) => void;
  onRefreshModels: () => void | Promise<void>;
  onBackToTraining: () => void;
};
