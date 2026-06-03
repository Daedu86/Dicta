import { useEffect, useMemo, useState } from 'react';
import type { OllamaModelSummary, OllamaWorkspaceProps } from './types';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;
const OLLAMA_RECOMMENDED_MODEL = 'gemma3:27b-cloud';

type OllamaUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

function buildOllamaModelOptions(models: OllamaModelSummary[], candidates: Array<string | null | undefined>): OllamaModelSummary[] {
  const byId = new Map<string, OllamaModelSummary>();
  for (const model of models) {
    if (model.id.trim()) byId.set(model.id, model);
  }
  for (const candidate of candidates) {
    const id = candidate?.trim();
    if (id && !byId.has(id)) byId.set(id, { id, name: id });
  }
  return [...byId.values()].sort((a, b) => {
    if (a.id === OLLAMA_RECOMMENDED_MODEL) return -1;
    if (b.id === OLLAMA_RECOMMENDED_MODEL) return 1;
    return a.id.localeCompare(b.id);
  });
}

function extractOllamaResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as {
    message?: { content?: unknown };
    response?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  if (typeof data.message?.content === 'string') return data.message.content;
  if (typeof data.response === 'string') return data.response;
  const choiceText = data.choices?.[0]?.message?.content;
  return typeof choiceText === 'string' ? choiceText : '';
}

function extractOllamaUsage(payload: unknown): OllamaUsage | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as {
    prompt_eval_count?: unknown;
    eval_count?: unknown;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown };
  };
  const promptTokens = Number(data.usage?.prompt_tokens ?? data.prompt_eval_count ?? 0);
  const completionTokens = Number(data.usage?.completion_tokens ?? data.eval_count ?? 0);
  const totalTokens = Number(data.usage?.total_tokens ?? promptTokens + completionTokens);
  if (!Number.isFinite(promptTokens) && !Number.isFinite(completionTokens) && !Number.isFinite(totalTokens)) return null;
  if (promptTokens <= 0 && completionTokens <= 0 && totalTokens <= 0) return null;
  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  };
}

export function OllamaWorkspace({
  defaultModel,
  authHeaders,
  models,
  status,
  error,
  onSetDefaultModel,
  onRefreshModels,
  onBackToTraining,
}: OllamaWorkspaceProps) {
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeySuffix, setApiKeySuffix] = useState('');
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel || OLLAMA_RECOMMENDED_MODEL);
  const [testPrompt, setTestPrompt] = useState('Say hello in one short sentence.');
  const [testResponse, setTestResponse] = useState('');
  const [testUsage, setTestUsage] = useState<OllamaUsage | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState('');

  const modelOptions = useMemo(
    () => buildOllamaModelOptions(models, [defaultModel, selectedModel, OLLAMA_RECOMMENDED_MODEL]),
    [defaultModel, models, selectedModel],
  );

  useEffect(() => {
    setSelectedModel(defaultModel || OLLAMA_RECOMMENDED_MODEL);
  }, [defaultModel]);

  useEffect(() => {
    void refreshApiKeyStatus();
  }, []);

  async function refreshApiKeyStatus(): Promise<void> {
    try {
      const response = await fetch('/api/ollama/key/status', { headers: authHeaders });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Ollama key status failed (${response.status}).`);
      }
      const payload = (await response.json()) as { configured?: boolean; suffix?: string };
      setApiKeyConfigured(Boolean(payload.configured));
      setApiKeySuffix(typeof payload.suffix === 'string' ? payload.suffix : '');
      if (!LOCAL_DEV_FEATURES_AVAILABLE) {
        setApiKeyMessage('Hosted builds read OLLAMA_API_KEY from Vercel environment variables.');
      }
    } catch (error) {
      setApiKeyConfigured(false);
      setApiKeySuffix('');
      setApiKeyMessage(error instanceof Error ? error.message : 'Ollama key status failed.');
    }
  }

  async function saveLocalApiKey(): Promise<void> {
    const nextKey = apiKeyDraft.trim();
    if (!nextKey) return;
    setApiKeyBusy(true);
    setApiKeyMessage('');
    try {
      const response = await fetch('/api/ollama/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ apiKey: nextKey }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Save request failed (${response.status}).`);
      }
      const payload = (await response.json()) as { suffix?: string };
      setApiKeyDraft('');
      setApiKeyVisible(false);
      setApiKeyMessage(`Key saved in .env.local (${typeof payload.suffix === 'string' ? payload.suffix : 'configured'}).`);
      await refreshApiKeyStatus();
    } catch (error) {
      setApiKeyMessage(error instanceof Error ? error.message : 'Failed to save key.');
    } finally {
      setApiKeyBusy(false);
    }
  }

  async function deleteLocalApiKey(): Promise<void> {
    setApiKeyBusy(true);
    setApiKeyMessage('');
    try {
      const response = await fetch('/api/ollama/key', { method: 'DELETE', headers: authHeaders });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Delete request failed (${response.status}).`);
      }
      setApiKeyDraft('');
      setApiKeyVisible(false);
      setApiKeyMessage('Key removed from .env.local.');
      await refreshApiKeyStatus();
    } catch (error) {
      setApiKeyMessage(error instanceof Error ? error.message : 'Failed to remove key.');
    } finally {
      setApiKeyBusy(false);
    }
  }

  async function sendTestPrompt(): Promise<void> {
    const prompt = testPrompt.trim();
    const model = selectedModel.trim();
    if (!prompt || !model) return;
    setTestBusy(true);
    setTestError('');
    setTestResponse('');
    setTestUsage(null);
    try {
      const response = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ model, prompt, maxTokens: 600 }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Ollama test failed (${response.status}).`);
      }
      const payload = (await response.json()) as unknown;
      const text = extractOllamaResponseText(payload);
      setTestResponse(text || JSON.stringify(payload, null, 2));
      setTestUsage(extractOllamaUsage(payload));
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Ollama model test failed.');
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <section className="panel workspace-panel admin-workspace">
      <div className="tts-workspace-header">
        <div>
          <p className="dashboard-eyebrow">Model gateway</p>
          <h2>Ollama</h2>
          <p className="dashboard-meta">
            Ollama Cloud uses your Ollama account tier. Free tier access is quota-limited; models do not use :free.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="secondary-button" onClick={onBackToTraining}>
            Back
          </button>
        </div>
      </div>

      <div className="dashboard-card admin-card">
        <div className="admin-card-header">
          <h3>Section # 1 API Key</h3>
        </div>
        <div className="admin-card-body">
          {!LOCAL_DEV_FEATURES_AVAILABLE ? (
            <>
              <p className="hint">
                Hosted Vercel builds use the server-side <span className="mono">OLLAMA_API_KEY</span> environment variable. Manage it in the
                Vercel project settings, then refresh models below to verify it.
              </p>
              {apiKeyMessage ? <p className="hint">{apiKeyMessage}</p> : null}
            </>
          ) : (
            <>
              <div className="admin-actions">
                <span className="hint">
                  {apiKeyConfigured ? `Key saved in .env.local (${apiKeySuffix || 'configured'}).` : 'No key saved in .env.local yet.'}
                </span>
                {apiKeyConfigured ? (
                  <button type="button" className="secondary-button" disabled={apiKeyBusy} onClick={() => void deleteLocalApiKey()}>
                    Delete from .env.local
                  </button>
                ) : null}
              </div>

              <label>
                Ollama API key
                <input
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                  placeholder="ollama_..."
                  type={apiKeyVisible ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setApiKeyVisible((value) => !value)}
                  disabled={!apiKeyDraft.trim() || apiKeyBusy}
                >
                  {apiKeyVisible ? 'Hide' : 'Show'}
                </button>
                <button type="button" disabled={!apiKeyDraft.trim() || apiKeyBusy} onClick={() => void saveLocalApiKey()}>
                  Save to .env.local
                </button>
              </div>
              {apiKeyMessage ? <p className={apiKeyMessage.toLowerCase().includes('failed') ? 'error' : 'hint'}>{apiKeyMessage}</p> : null}
              <p className="hint">
                This writes <span className="mono">OLLAMA_API_KEY</span> into <span className="mono">.env.local</span>. The key is read by the dev
                server and never persisted to <span className="mono">localStorage</span>.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="dashboard-card admin-card">
        <div className="admin-card-header">
          <h3>Section # 2 Cloud Models</h3>
        </div>
        <div className="admin-card-body">
          <div className="admin-actions">
            <button type="button" className="secondary-button" onClick={() => void onRefreshModels()} disabled={status === 'loading'}>
              {status === 'loading' ? 'Refreshing...' : 'Refresh models'}
            </button>
            <span className="hint">
              {status === 'ready' ? `${models.length} model(s) loaded.` : status === 'loading' ? 'Querying Ollama Cloud...' : ''}
            </span>
          </div>
          {error ? <p className="error">{error}</p> : null}

          <label>
            Default model
            <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={modelOptions.length === 0}>
              {modelOptions.length === 0 ? <option value="">No models loaded</option> : null}
              {modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}{model.details?.parameter_size ? ` (${model.details.parameter_size})` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-actions">
            <button type="button" onClick={() => onSetDefaultModel(selectedModel)} disabled={!selectedModel}>
              Set default model
            </button>
            <span className="hint">Default model set: {defaultModel || OLLAMA_RECOMMENDED_MODEL}</span>
          </div>
          <p className="hint">
            Recommended initial model: <span className="mono">{OLLAMA_RECOMMENDED_MODEL}</span>. Ollama Cloud model availability depends on your
            Ollama account plan and quota.
          </p>
        </div>
      </div>

      <div className="dashboard-card admin-card">
        <div className="admin-card-header">
          <h3>Section # 3 Testing model</h3>
        </div>
        <div className="admin-card-body">
          <label>
            Prompt
            <textarea
              value={testPrompt}
              onChange={(event) => setTestPrompt(event.target.value)}
              placeholder="Type a quick test prompt..."
              rows={4}
            />
          </label>
          <div className="admin-actions">
            <button type="button" className="secondary-button" disabled={testBusy || !testPrompt.trim() || !selectedModel} onClick={() => void sendTestPrompt()}>
              {testBusy ? 'Testing...' : 'Send test'}
            </button>
            <span className="hint">{selectedModel ? `Using: ${selectedModel}` : 'Set a default model first.'}</span>
          </div>
          {testError ? <p className="error">{testError}</p> : null}
          {testUsage ? (
            <p className="hint">
              Tokens: input {testUsage.promptTokens}, output {testUsage.completionTokens}, total {testUsage.totalTokens}.
            </p>
          ) : null}
          {testResponse ? (
            <label>
              Response
              <textarea value={testResponse} readOnly rows={8} />
            </label>
          ) : null}
        </div>
      </div>
    </section>
  );
}
