import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

type OpenRouterModelTestWorkspaceProps = Pick<OpenRouterWorkspaceProps, 'defaultModel' | 'authHeaders'>;

type OpenRouterModelTestRuntime = Pick<
  OpenRouterWorkspaceRuntime,
  | 'testPrompt'
  | 'setTestPrompt'
  | 'testResponse'
  | 'setTestResponse'
  | 'testUsage'
  | 'setTestUsage'
  | 'testBusy'
  | 'setTestBusy'
  | 'testError'
  | 'setTestError'
>;

export type OpenRouterModelTestSectionProps = {
  workspace: OpenRouterModelTestWorkspaceProps;
  runtime: OpenRouterModelTestRuntime;
};

export function OpenRouterModelTestSection({ workspace, runtime }: OpenRouterModelTestSectionProps) {
  const { defaultModel, authHeaders } = workspace;
  const {
    testPrompt,
    setTestPrompt,
    testResponse,
    setTestResponse,
    testUsage,
    setTestUsage,
    testBusy,
    setTestBusy,
    testError,
    setTestError,
  } = runtime;

  return (
    <div className="admin-card-body">
      <label>
        Prompt
        <textarea
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          placeholder="Type a quick test prompt…"
          rows={4}
        />
      </label>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={testBusy || !testPrompt.trim() || !defaultModel}
          onClick={() => {
            const prompt = testPrompt.trim();
            if (!prompt || !defaultModel) return;
            setTestBusy(true);
            setTestError('');
            setTestResponse('');
            setTestUsage(null);
            void (async () => {
              try {
                const response = await fetch('/api/openrouter/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeaders },
                  body: JSON.stringify({ model: defaultModel, prompt, maxTokens: 600 }),
                });
                if (!response.ok) {
                  const text = await response.text();
                  throw new Error(text || `Test request failed (${response.status}).`);
                }
                const payload = (await response.json()) as {
                  choices?: Array<{ message?: { content?: string } }>;
                  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
                };
                const text =
                  payload.choices?.[0]?.message?.content && typeof payload.choices[0].message?.content === 'string'
                    ? payload.choices[0].message?.content
                    : '';
                setTestResponse(text || '(No response text returned.)');
                const usage = payload.usage ?? {};
                const promptTokens = Number(usage.prompt_tokens ?? 0);
                const completionTokens = Number(usage.completion_tokens ?? 0);
                const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens);
                setTestUsage({
                  promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
                  completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
                  totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
                });
              } catch (err) {
                setTestError(err instanceof Error ? err.message : 'Model test failed.');
              } finally {
                setTestBusy(false);
              }
            })();
          }}
        >
          {testBusy ? 'Testing…' : 'Send test'}
        </button>
        <span className="hint">{defaultModel ? `Using: ${defaultModel}` : 'Set a default model first (Section #2).'}</span>
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
          <textarea value={testResponse} readOnly rows={6} />
        </label>
      ) : null}
    </div>
  );
}
