import { OpenRouterGenerateActionPanel } from './OpenRouterGenerateActionPanel';
import { OpenRouterGenerateSummary } from './OpenRouterGenerateSummary';
import { OpenRouterGeneratedOutputPanel } from './OpenRouterGeneratedOutputPanel';
import { OpenRouterGenerationStatusPanel } from './OpenRouterGenerationStatusPanel';
import { OpenRouterModelSelector } from './OpenRouterModelSelector';
import { OpenRouterPromptControls } from './OpenRouterPromptControls';
import { OpenRouterSlotSelector } from './OpenRouterSlotSelector';
import {
  OPENROUTER_GENERATION_SLOT_IDS,
  formatElapsedMs,
  getOpenRouterSlotLabel,
  validateGeneratedScriptForTarget,
} from './openRouterViewHelpers';
import type { OpenRouterWorkspaceProps } from './types';
import { useOpenRouterWorkspaceRuntime } from './useOpenRouterWorkspaceRuntime';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

export function OpenRouterWorkspace(props: OpenRouterWorkspaceProps) {
  const {
  defaultModel,
  assignedModel,
  authHeaders,
  onSetDefaultModel,
  models,
  status,
  error,
  onRefreshModels,
  onBackToTraining,
  exportProfile,
  exportSessionFeedback,
  onSelectExportProfile,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyBenchmarkWithScriptPrompt,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedback,
  onCopySessionFeedback,
  onCopyScriptPrompt,
  onCopyScriptTemplate,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
  } = props;

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
    selectedModel,
    setSelectedModel,
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
    exportStatusMessage,
    setExportStatusMessage,
    humanFeedbackEditorOpen,
    setHumanFeedbackEditorOpen,
    humanFeedbackDraft,
    setHumanFeedbackDraft,
    generateInputMode,
    setGenerateInputMode,
    generateLanguage,
    setGenerateLanguage,
    generatePromptSource,
    setGeneratePromptSource,
    generateDurationMinutes,
    setGenerateDurationMinutes,
    activeGenerateSlotId,
    setActiveGenerateSlotId,
    generationSlots,
    generateBusySlots,
    sectionsExpanded,
    setSectionsExpanded,
    modelSelectionLocked,
    modelOptions,
    copyToClipboard,
    formatPromptSizeHint,
    clearGeneratedScriptDraft,
    generateOpenRouterSlot,
    exportPayloads,
    generateHasBenchmarkData,
    generateHasSessionFeedback,
    activeGenerateSlot,
    activeGenerateSlotModel,
    activeGenerateSlotPrompt,
    activeGenerateSlotValidation,
    activeGenerateSlotJob,
    activeGenerateSlotJobNotice,
    activeGenerateSlotBusy,
    refreshApiKeyStatus,
    exportHasBenchmarkData,
    exportHasSessionFeedback,
    exportLanguage,
    profileInputModeOptions,
    generateInputModeOptions,
    profileLanguageOptions,
    generatePromptSourceOptions,
    generateDurationOptions,
  } = useOpenRouterWorkspaceRuntime(props);

  return (
    <section className="panel workspace-panel admin-workspace">
      <div className="tts-workspace-header">
        <div>
          <p className="dashboard-eyebrow">Model gateway</p>
          <h2>OpenRouter</h2>
          <p className="dashboard-meta">
            Fetches models via a server API route so the OpenRouter key is not stored in the browser.
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
          <button
            type="button"
            className="secondary-button adaptive-section-toggle"
            onClick={() => setSectionsExpanded((prev) => ({ ...prev, apiKey: !prev.apiKey }))}
            aria-expanded={sectionsExpanded.apiKey}
            aria-label={sectionsExpanded.apiKey ? 'Collapse section' : 'Expand section'}
            title={sectionsExpanded.apiKey ? 'Collapse' : 'Expand'}
          >
            <span className={`adaptive-section-toggle-icon ${sectionsExpanded.apiKey ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
          </button>
        </div>
        {sectionsExpanded.apiKey ? <div className="admin-card-body">
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
            This writes `OPENROUTER_API_KEY` into `.env.local` on your machine. The key is read by the dev server and never persisted to `localStorage`.
          </p>
          </>
          )}
        </div> : null}
      </div>

      <div className="dashboard-card admin-card">
        <div className="admin-card-header">
          <h3>Section # 2 Free Models</h3>
          <button
            type="button"
            className="secondary-button adaptive-section-toggle"
            onClick={() => setSectionsExpanded((prev) => ({ ...prev, models: !prev.models }))}
            aria-expanded={sectionsExpanded.models}
            aria-label={sectionsExpanded.models ? 'Collapse section' : 'Expand section'}
            title={sectionsExpanded.models ? 'Collapse' : 'Expand'}
          >
            <span className={`adaptive-section-toggle-icon ${sectionsExpanded.models ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
          </button>
        </div>
        {sectionsExpanded.models ? (
          <OpenRouterModelSelector
            defaultModel={defaultModel}
            assignedModel={assignedModel}
            selectedModel={selectedModel}
            modelOptions={modelOptions}
            freeModelCount={models.length}
            modelSelectionLocked={modelSelectionLocked}
            status={status}
            error={error}
            onSelectModel={setSelectedModel}
            onSetDefaultModel={onSetDefaultModel}
            onRefreshModels={onRefreshModels}
          />
        ) : null}
      </div>

      <div className="dashboard-card admin-card">
        <div className="admin-card-header">
          <h3>Section # 3 Testing model</h3>
          <button
            type="button"
            className="secondary-button adaptive-section-toggle"
            onClick={() => setSectionsExpanded((prev) => ({ ...prev, test: !prev.test }))}
            aria-expanded={sectionsExpanded.test}
            aria-label={sectionsExpanded.test ? 'Collapse section' : 'Expand section'}
            title={sectionsExpanded.test ? 'Collapse' : 'Expand'}
          >
            <span className={`adaptive-section-toggle-icon ${sectionsExpanded.test ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
          </button>
        </div>
        {sectionsExpanded.test ? <div className="admin-card-body">
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
        </div> : null}
      </div>

      <div className="dashboard-card admin-card">
        <div className="admin-card-header">
          <h3>Section # 4 Export / Copy Actions</h3>
          <button
            type="button"
            className="secondary-button adaptive-section-toggle"
            onClick={() => setSectionsExpanded((prev) => ({ ...prev, exports: !prev.exports }))}
            aria-expanded={sectionsExpanded.exports}
            aria-label={sectionsExpanded.exports ? 'Collapse section' : 'Expand section'}
            title={sectionsExpanded.exports ? 'Collapse' : 'Expand'}
          >
            <span className={`adaptive-section-toggle-icon ${sectionsExpanded.exports ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
          </button>
        </div>
        {sectionsExpanded.exports ? <div className="admin-card-body">
          {exportStatusMessage ? <p className="success">{exportStatusMessage}</p> : null}
          <p className="dashboard-meta">Exports use: {exportProfile.inputMode}/{exportProfile.language}</p>
          <div className="openrouter-generate-controls openrouter-export-profile-controls">
            <section className="openrouter-button-control" aria-label="Section 4 input mode">
              <h4>Input mode</h4>
              <div className="openrouter-choice-row">
                {profileInputModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`secondary-button openrouter-choice-button ${exportProfile.inputMode === option.value ? 'openrouter-choice-button-active' : ''}`}
                    onClick={() => onSelectExportProfile(option.value, exportLanguage)}
                    aria-pressed={exportProfile.inputMode === option.value}
                    title={`Use ${option.description} benchmark exports for Section #4.`}
                  >
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="openrouter-button-control" aria-label="Section 4 language">
              <h4>Language</h4>
              <div className="openrouter-choice-row openrouter-language-row">
                {profileLanguageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`secondary-button openrouter-choice-button ${exportLanguage === option.value ? 'openrouter-choice-button-active' : ''}`}
                    onClick={() => onSelectExportProfile(exportProfile.inputMode, option.value)}
                    aria-pressed={exportLanguage === option.value}
                    title={`Use ${option.value} benchmark exports for Section #4.`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="adaptive-export-groups">
              <div>
                <p className="dashboard-eyebrow">Benchmark JSON</p>
                <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onCopyBenchmark(exportProfile)}
                  title={`Copies benchmark JSON to clipboard.\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
                >
                  Copy Benchmark JSON
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
                  title={`Compact version: benchmark summary only (no timeline / large arrays).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onExportBenchmark(exportProfile)}
                  title={`Downloads benchmark JSON.\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
                >
                  Export Benchmark JSON
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
                  title={`Compact version: copies benchmark summary JSON (clipboard).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                >
                  Export
                </button>
              </div>
            </div>
            <div>
              <p className="dashboard-eyebrow">Primary</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button adaptive-recommended-action"
                  onClick={() => {
                    onCopyBenchmarkFeedbackPrompt(exportProfile, exportSessionFeedback);
                    setExportStatusMessage(`Copied: Next adaptive script prompt · ${exportProfile.inputMode}/${exportProfile.language}`);
                  }}
                  disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
                  title={`Copies a ready-to-use prompt package (benchmark + latest session feedback). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.promptPackage)}`}
                >
                  Copy next adaptive script prompt
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button adaptive-recommended-action"
                  onClick={() => {
                    void copyToClipboard('Next adaptive script prompt (compact)', exportPayloads.compactPromptPackage);
                  }}
                  disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
                  title={`Compact version: JSON package (benchmark summary + feedback summary + base prompt). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.compactPromptPackage)}`}
                >
                  Copy prompt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setHumanFeedbackEditorOpen(true)}
                  disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
                  title={`Opens a notes editor, then copies JSON payload including your notes.\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                >
                  Copy prompt with my notes
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => setHumanFeedbackEditorOpen(true)}
                  disabled={!exportHasBenchmarkData || !exportHasSessionFeedback}
                  title={`Compact version: open notes editor (submit copies compact payload).\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                >
                  Notes prompt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyBenchmarkWithScriptPrompt(exportProfile);
                    setExportStatusMessage(`Copied: Benchmark-only script prompt · ${exportProfile.inputMode}/${exportProfile.language}`);
                  }}
                  disabled={!exportHasBenchmarkData}
                  title={`Copies benchmark JSON context + base LLM prompt. This does not generate a session.\n${formatPromptSizeHint(exportPayloads.benchmarkOnlyPackage)}`}
                >
                  Copy benchmark-only prompt
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Benchmark-only prompt context (compact)', exportPayloads.compactBenchmark);
                  }}
                  disabled={!exportHasBenchmarkData}
                  title={`Compact version: copies benchmark summary only.\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                >
                  Copy benchmark
                </button>
              </div>
              {!exportHasBenchmarkData ? <p className="hint">No benchmark available for this profile yet.</p> : null}
              {!exportHasSessionFeedback ? <p className="hint">No completed session feedback for this profile yet.</p> : null}
            </div>
            <div>
              <p className="dashboard-eyebrow">Diagnostics</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyBenchmarkFeedback(exportProfile, exportSessionFeedback);
                    setExportStatusMessage(`Copied: Full diagnostic package · ${exportProfile.inputMode}/${exportProfile.language}`);
                  }}
                  disabled={!exportHasBenchmarkData}
                  title={`Copies a diagnostic JSON package (benchmark + feedback when available).\n${formatPromptSizeHint(exportPayloads.diagnosticPackage)}`}
                >
                  Copy full diagnostic package
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Diagnostics (compact)', exportPayloads.compactSessionFeedback);
                  }}
                  disabled={!exportHasBenchmarkData}
                  title={`Compact version: feedback summary JSON (no large phrase previews).\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
                >
                  Diagnostics
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopySessionFeedback(exportProfile, exportSessionFeedback);
                    setExportStatusMessage(`Copied: Latest session feedback · ${exportProfile.inputMode}/${exportProfile.language}`);
                  }}
                  disabled={!exportHasSessionFeedback}
                  title={`Copies latest session feedback JSON (includes fallback diagnostics).\n${formatPromptSizeHint(exportPayloads.sessionFeedbackJson)}`}
                >
                  Copy latest session feedback
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Session feedback (compact)', exportPayloads.compactSessionFeedback);
                  }}
                  disabled={!exportHasSessionFeedback}
                  title={`Compact version: feedback summary JSON.\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
                >
                  Feedback
                </button>
              </div>
            </div>
            <div>
              <p className="dashboard-eyebrow">Templates</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyScriptPrompt(exportProfile);
                    setExportStatusMessage(`Copied: Base prompt · ${exportProfile.inputMode}/${exportProfile.language}`);
                  }}
                  title={`Copies the base prompt template (no benchmark/session feedback).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
                >
                  Copy base prompt
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Base prompt', exportPayloads.llmPrompt);
                  }}
                  title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
                >
                  Prompt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onCopyScriptTemplate(exportProfile);
                    setExportStatusMessage(`Copied: Output template · ${exportProfile.inputMode}/${exportProfile.language}`);
                  }}
                  title={`Copies the output JSON template expected for generated scripts.\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
                >
                  Copy output template
                </button>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    void copyToClipboard('Output template', exportPayloads.outputTemplate);
                  }}
                  title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
                >
                  Template
                </button>
              </div>
            </div>
          </div>
          {humanFeedbackEditorOpen ? (
            <div className="adaptive-human-feedback-editor">
              <textarea
                value={humanFeedbackDraft}
                onChange={(e) => setHumanFeedbackDraft(e.target.value)}
                placeholder="Add notes for the next script (topics, required words, constraints)..."
                rows={4}
              />
              <div className="adaptive-human-feedback-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setHumanFeedbackEditorOpen(false);
                    setHumanFeedbackDraft('');
                  }}
                  title="Close without copying anything."
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCopyBenchmarkFeedbackPromptWithHumanFeedback(exportProfile, exportSessionFeedback, humanFeedbackDraft);
                    setExportStatusMessage(
                      `Copied: Script prompt with my notes · ${exportProfile.inputMode}/${exportProfile.language} · human notes included`,
                    );
                    setHumanFeedbackEditorOpen(false);
                    setHumanFeedbackDraft('');
                  }}
                  disabled={humanFeedbackDraft.trim().length === 0 || !exportHasBenchmarkData || !exportHasSessionFeedback}
                  title={`Copies JSON payload including benchmark + feedback + base prompt + your notes.\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                >
                  Submit
                </button>
              </div>
            </div>
          ) : null}
        </div> : null}
      </div>

      <div className="dashboard-card admin-card" id="openrouter-generate-section">
        <div className="admin-card-header">
          <h3>Section # 5 Generate Training Session</h3>
          <button
            type="button"
            className="secondary-button adaptive-section-toggle"
            onClick={() => setSectionsExpanded((prev) => ({ ...prev, generate: !prev.generate }))}
            aria-expanded={sectionsExpanded.generate}
            aria-label={sectionsExpanded.generate ? 'Collapse section' : 'Expand section'}
            title={sectionsExpanded.generate ? 'Collapse' : 'Expand'}
          >
            <span className={`adaptive-section-toggle-icon ${sectionsExpanded.generate ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
          </button>
        </div>
        {sectionsExpanded.generate ? (
          <div className="admin-card-body">
            <OpenRouterSlotSelector
              slots={OPENROUTER_GENERATION_SLOT_IDS.map((slotId) => {
                const slot = generationSlots[slotId];
                const slotValidation =
                  slot.json && slot.inputMode && slot.language ? validateGeneratedScriptForTarget(slot.json, slot.inputMode, slot.language) : null;
                return {
                  id: slotId,
                  label: getOpenRouterSlotLabel(slotId),
                  active: activeGenerateSlotId === slotId,
                  statusLabel: slotValidation?.ok ? 'ready to create' : slot.error ? 'needs fix' : slot.json || slot.text ? 'draft saved' : 'empty setup',
                };
              })}
              onSelectSlot={setActiveGenerateSlotId}
            />

            <OpenRouterGenerateSummary
              targetLabel={`${generateInputMode}/${generateLanguage}`}
              benchmarkAvailable={generateHasBenchmarkData}
              feedbackAvailable={generateHasSessionFeedback}
              durationLabel={`${generateDurationMinutes} min`}
              promptSizeLabel={formatPromptSizeHint(activeGenerateSlotPrompt).replace('Words: ', '').replace(' · Tokens:', ' /')}
              prompt={activeGenerateSlotPrompt}
            >
              <OpenRouterPromptControls
                inputModeOptions={generateInputModeOptions}
                selectedInputMode={generateInputMode}
                onSelectInputMode={setGenerateInputMode}
                durationOptions={generateDurationOptions}
                selectedDurationMinutes={generateDurationMinutes}
                onSelectDurationMinutes={setGenerateDurationMinutes}
                languageOptions={profileLanguageOptions}
                selectedLanguage={generateLanguage}
                onSelectLanguage={setGenerateLanguage}
                promptSourceOptions={generatePromptSourceOptions}
                selectedPromptSource={generatePromptSource}
                onSelectPromptSource={setGeneratePromptSource}
              />
            </OpenRouterGenerateSummary>

            <OpenRouterGenerateActionPanel
              disabled={activeGenerateSlotBusy || !activeGenerateSlotModel}
              requesting={Boolean(generateBusySlots[activeGenerateSlotId])}
              generating={Boolean(activeGenerateSlotJob)}
              slotLabel={getOpenRouterSlotLabel(activeGenerateSlotId)}
              model={activeGenerateSlotModel}
              onGenerate={() => void generateOpenRouterSlot(activeGenerateSlotId)}
            />
            <OpenRouterGenerationStatusPanel
              slotLabel={getOpenRouterSlotLabel(activeGenerateSlotId)}
              jobNotice={activeGenerateSlotJobNotice}
              usage={activeGenerateSlot.usage}
              elapsedLabel={activeGenerateSlot.elapsedMs !== null ? formatElapsedMs(activeGenerateSlot.elapsedMs) : null}
              generatedAtLabel={activeGenerateSlot.generatedAt ? new Date(activeGenerateSlot.generatedAt).toLocaleString() : null}
              error={activeGenerateSlot.error}
              hasDraft={Boolean(activeGenerateSlot.json || activeGenerateSlot.text)}
              draftInputMode={activeGenerateSlot.inputMode}
              draftLanguage={activeGenerateSlot.language}
              onClearDraft={() => clearGeneratedScriptDraft(activeGenerateSlotId)}
            />

            <OpenRouterGeneratedOutputPanel
              slotLabel={getOpenRouterSlotLabel(activeGenerateSlotId)}
              validationSummary={
                activeGenerateSlotValidation?.ok
                  ? {
                      title: activeGenerateSlotValidation.script.title,
                      inputMode: String(activeGenerateSlotValidation.script.inputMode),
                      language: activeGenerateSlotValidation.script.language,
                      difficulty: activeGenerateSlotValidation.script.difficulty,
                      phrases: String(activeGenerateSlotValidation.script.phrases.length),
                      duration: `${activeGenerateSlotValidation.script.estimatedDurationSec}s`,
                    }
                  : null
              }
              json={activeGenerateSlot.json}
              text={activeGenerateSlot.text}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
