import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

type OpenRouterApiKeyWorkspaceProps = Pick<OpenRouterWorkspaceProps, 'authHeaders'>;

type OpenRouterApiKeyRuntime = Pick<
  OpenRouterWorkspaceRuntime,
  | 'apiKeyDraft'
  | 'setApiKeyDraft'
  | 'apiKeyVisible'
  | 'setApiKeyVisible'
  | 'apiKeyConfigured'
  | 'apiKeySuffix'
  | 'apiKeyMessage'
  | 'setApiKeyMessage'
  | 'apiKeyBusy'
  | 'setApiKeyBusy'
  | 'refreshApiKeyStatus'
>;

export type OpenRouterApiKeySectionProps = {
  workspace: OpenRouterApiKeyWorkspaceProps;
  runtime: OpenRouterApiKeyRuntime;
};

export function OpenRouterApiKeySection({ workspace, runtime }: OpenRouterApiKeySectionProps) {
  const { authHeaders } = workspace;
  const {
    apiKeyDraft,
    setApiKeyDraft,
    apiKeyVisible,
    setApiKeyVisible,
    apiKeyConfigured,
    apiKeySuffix,
    apiKeyMessage,
    setApiKeyMessage,
    apiKeyBusy,
    setApiKeyBusy,
    refreshApiKeyStatus,
  } = runtime;

  return (
    <div className="admin-card-body">
      {!LOCAL_DEV_FEATURES_AVAILABLE ? (
        <>
          <p className="hint">
            Hosted Vercel builds use the server-side <span className="mono">OPENROUTER_API_KEY</span> environment variable. Manage it in the
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
              <button
                type="button"
                className="secondary-button"
                disabled={apiKeyBusy}
                onClick={() => {
                  setApiKeyBusy(true);
                  setApiKeyMessage('');
                  void (async () => {
                    try {
                      const response = await fetch('/api/openrouter/key', { method: 'DELETE' });
                      if (!response.ok) {
                        const text = await response.text();
                        throw new Error(text || `Delete request failed (${response.status}).`);
                      }
                      setApiKeyDraft('');
                      setApiKeyVisible(false);
                      setApiKeyMessage('Key removed from .env.local.');
                      await refreshApiKeyStatus();
                    } catch (err) {
                      setApiKeyMessage(err instanceof Error ? err.message : 'Failed to remove key.');
                    } finally {
                      setApiKeyBusy(false);
                    }
                  })();
                }}
              >
                Delete from .env.local
              </button>
            ) : null}
          </div>

          <label>
            OpenRouter API key
            <input
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder="sk-or-..."
              type={apiKeyVisible ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="admin-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setApiKeyVisible((v) => !v)}
              disabled={!apiKeyDraft.trim() || apiKeyBusy}
            >
              {apiKeyVisible ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              disabled={!apiKeyDraft.trim() || apiKeyBusy}
              onClick={() => {
                const nextKey = apiKeyDraft.trim();
                if (!nextKey) return;
                setApiKeyBusy(true);
                setApiKeyMessage('');
                void (async () => {
                  try {
                    const response = await fetch('/api/openrouter/key', {
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
                  } catch (err) {
                    setApiKeyMessage(err instanceof Error ? err.message : 'Failed to save key.');
                  } finally {
                    setApiKeyBusy(false);
                  }
                })();
              }}
            >
              Save to .env.local
            </button>
          </div>
          {apiKeyMessage ? <p className={apiKeyMessage.toLowerCase().includes('failed') ? 'error' : 'hint'}>{apiKeyMessage}</p> : null}
          <p className="hint">
            This writes `OPENROUTER_API_KEY` into `.env.local` on your machine. The key is read by the dev server and never persisted to
            `localStorage`.
          </p>
        </>
      )}
    </div>
  );
}
