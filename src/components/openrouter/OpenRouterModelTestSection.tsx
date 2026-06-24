import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';
import { parseDictationScriptJson } from '../../core/adaptive/dictationScriptValidation';

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

const DICTATION_SCRIPT_JSON_TEST_PROMPT = [
  'Return only one valid JSON object. Do not use Markdown. Do not explain.',
  'Create a minimal Dicta DictationScript for browser-tts/en.',
  'The JSON must include title, language, inputMode, difficulty, estimatedDurationSec, targetSkills, recommendedRateRange, recommendedPhraseSize, recommendedPauseMs, and phrases.',
  'Each phrase must include id, text, boundaryType, pauseAfterMs, canReplayIndependently, requiresContinuation, semanticCompleteness, difficulty, emphasisWords, and intonationHint.',
  'Use exactly this shape, but fill natural English phrase text:',
  JSON.stringify({
    title: 'Morning Errands',
    language: 'en',
    inputMode: 'browser-tts',
    difficulty: 'normal',
    estimatedDurationSec: 60,
    targetSkills: ['accuracy'],
    recommendedRateRange: [0.9, 1],
    recommendedPhraseSize: 'medium',
    recommendedPauseMs: 700,
    phrases: [
      {
        id: 'p01',
        text: 'I check the list before leaving the apartment.',
        boundaryType: 'sentence',
        pauseAfterMs: 700,
        canReplayIndependently: true,
        requiresContinuation: false,
        semanticCompleteness: 0.95,
        difficulty: 0.5,
        emphasisWords: [],
        intonationHint: 'falling',
      },
      {
        id: 'p02',
        text: 'At the corner shop, I ask for fresh bread and apples.',
        boundaryType: 'sentence',
        pauseAfterMs: 700,
        canReplayIndependently: true,
        requiresContinuation: false,
        semanticCompleteness: 0.95,
        difficulty: 0.5,
        emphasisWords: [],
        intonationHint: 'falling',
      },
    ],
  }),
].join('\n');

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

  const runModelTest = (prompt: string, maxTokens: number, validateDictationScript: boolean): void => {
    if (!prompt.trim() || !defaultModel) return;
    setTestBusy(true);
    setTestError('');
    setTestResponse('');
    setTestUsage(null);
    void (async () => {
      try {
        const response = await fetch('/api/openrouter/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ model: defaultModel, prompt: prompt.trim(), maxTokens }),
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
        if (validateDictationScript) {
          const validation = parseDictationScriptJson(text);
          if (!validation.ok) {
            throw new Error(`Model responded, but DictationScript JSON is invalid: ${validation.errors.slice(0, 3).join(' ') || 'No valid JSON found.'}`);
          }
        }
        setTestResponse(validateDictationScript ? `Valid DictationScript JSON.\n\n${text || '(No response text returned.)'}` : text || '(No response text returned.)');
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
  };

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
          onClick={() => runModelTest(testPrompt, 600, false)}
        >
          {testBusy ? 'Testing…' : 'Send test'}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={testBusy || !defaultModel}
          onClick={() => runModelTest(DICTATION_SCRIPT_JSON_TEST_PROMPT, 1600, true)}
        >
          {testBusy ? 'Testing…' : 'Test DictationScript JSON'}
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
