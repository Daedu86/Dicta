import { useEffect, useMemo, useRef, useState } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import { COSYVOICE_CACHE_INPUT_MODE } from '../../core/adaptive/inputModes';
import { createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildSelectedBenchmarkExportPayload } from '../../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../../core/adaptive/dictationScriptPrompt';
import {
  buildOpenRouterGenerationPrompt,
  estimateOpenRouterPromptSize,
  getOpenRouterGenerationMaxTokens,
  type OpenRouterGeneratePromptSource,
} from '../../core/adaptive/openRouterGenerationPrompt';
import { isTransientOpenRouterGenerationError } from '../../core/adaptive/openRouterFallbackScript';
import type { DictationScriptValidationResult } from '../../core/adaptive/dictationScriptValidation';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
  selectLatestAdaptiveSessionFeedback,
} from '../../core/adaptive/sessionFeedback';
import type { ActiveOpenRouterJob, OpenRouterJobResponse } from '../../core/openRouterJobs';
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from '../../core/languages';
import { requestTrainingNotificationPermission } from '../../core/trainingNotifications';
import { OpenRouterGenerateActionPanel } from './OpenRouterGenerateActionPanel';
import { OpenRouterGenerateSummary } from './OpenRouterGenerateSummary';
import { OpenRouterGeneratedOutputPanel } from './OpenRouterGeneratedOutputPanel';
import { OpenRouterGenerationStatusPanel } from './OpenRouterGenerationStatusPanel';
import { OpenRouterModelSelector } from './OpenRouterModelSelector';
import { OpenRouterPromptControls } from './OpenRouterPromptControls';
import { OpenRouterSlotSelector } from './OpenRouterSlotSelector';
import {
  OPENROUTER_GENERATION_SLOT_IDS,
  buildOpenRouterModelOptions,
  createEmptyOpenRouterGenerationSlot,
  createEmptyOpenRouterGenerationSlots,
  formatElapsedMs,
  formatInterruptedOpenRouterMessage,
  formatTrainingGenerationNotice,
  getOpenRouterSlotLabel,
  loadPersistedOpenRouterGenerationVariants,
  parseTimestampMs,
  persistOpenRouterGenerationVariants,
  releaseOpenRouterWakeLock,
  requestOpenRouterWakeLock,
  shouldCreatePersistentGenerationErrorSession,
  validateGeneratedScriptForTarget,
} from './openRouterViewHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterGenerationSlotState,
  OpenRouterWorkspaceProps,
  TrainingGenerationNoticeView,
} from './types';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

export function OpenRouterWorkspace({
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
  exportActiveSessionStatus,
  benchmarks,
  sessionFeedbackByInputLanguage,
  onSelectExportProfile,
  defaultGenerateInputMode,
  defaultGenerateLanguage,
  focusGenerateRequest,
  activeJobs,
  jobNotifications,
  generationNowMs,
  onTrackJob,
  onCreateGenerationErrorSession,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyBenchmarkWithScriptPrompt,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedback,
  onCopySessionFeedback,
  onCopyScriptPrompt,
  onCopyScriptTemplate,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: OpenRouterWorkspaceProps) {
  const persistedGenerationSlotsRef = useRef<OpenRouterGenerationSlots | null>(loadPersistedOpenRouterGenerationVariants(defaultModel));
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeySuffix, setApiKeySuffix] = useState('');
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testUsage, setTestUsage] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState('');
  const [exportStatusMessage, setExportStatusMessage] = useState('');
  const [humanFeedbackEditorOpen, setHumanFeedbackEditorOpen] = useState(false);
  const [humanFeedbackDraft, setHumanFeedbackDraft] = useState('');
  const [generateInputMode, setGenerateInputMode] = useState<InputMode>(defaultGenerateInputMode);
  const [generateLanguage, setGenerateLanguage] = useState<BenchmarkLanguageButton>(defaultGenerateLanguage);
  const [generatePromptSource, setGeneratePromptSource] = useState<OpenRouterGeneratePromptSource>('compact-adaptive');
  const [generateDurationMinutes, setGenerateDurationMinutes] = useState<2 | 3 | 4>(3);
  const [activeGenerateSlotId, setActiveGenerateSlotId] = useState<OpenRouterGenerationSlotId>('prompt1');
  const [generationSlots, setGenerationSlots] = useState<OpenRouterGenerationSlots>(
    () => persistedGenerationSlotsRef.current ?? createEmptyOpenRouterGenerationSlots(defaultModel),
  );
  const [generateBusySlots, setGenerateBusySlots] = useState<Record<OpenRouterGenerationSlotId, boolean>>({
    prompt1: false,
    prompt2: false,
  });
  const [sectionsExpanded, setSectionsExpanded] = useState({
    apiKey: true,
    models: true,
    test: true,
    exports: true,
    generate: true,
  });
  const modelSelectionLocked = Boolean(assignedModel);
  const modelOptions = useMemo(() => buildOpenRouterModelOptions(models, [defaultModel, assignedModel]), [assignedModel, defaultModel, models]);

  const copyToClipboard = async (label: string, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setExportStatusMessage(`Copied: ${label} · ${exportProfile.inputMode}/${exportProfile.language}`);
    } catch {
      setExportStatusMessage(`Could not copy: ${label}.`);
    }
  };

  const formatPromptSizeHint = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return 'Words: 0 · Tokens: ~0';
    const words = normalized.split(/\s+/).filter(Boolean).length;
    const chars = normalized.length;
    const estimatedTokens = Math.max(1, Math.round(chars / 4));
    return `Words: ${words} · Tokens: ~${estimatedTokens}`;
  };

  function updateGenerationSlots(updater: (current: OpenRouterGenerationSlots) => OpenRouterGenerationSlots): void {
    setGenerationSlots((current) => {
      const next = updater(current);
      persistOpenRouterGenerationVariants(next);
      return next;
    });
  }

  function updateGenerationSlot(slotId: OpenRouterGenerationSlotId, patch: Partial<OpenRouterGenerationSlotState>): void {
    updateGenerationSlots((current) => ({
      ...current,
      [slotId]: {
        ...current[slotId],
        ...patch,
      },
    }));
  }

  function clearGeneratedScriptDraft(slotId: OpenRouterGenerationSlotId): void {
    updateGenerationSlots((current) => ({
      ...current,
      [slotId]: createEmptyOpenRouterGenerationSlot(defaultModel),
    }));
  }

  function buildVariantPrompt(slotId: OpenRouterGenerationSlotId, basePrompt: string, slot: OpenRouterGenerationSlotState, modelId: string): string {
    const slotLabel = getOpenRouterSlotLabel(slotId);
    const notes = slot.notes.trim() || 'No additional variant notes.';
    return [
      basePrompt,
      '',
      `Variant-specific notes for ${slotLabel}:`,
      `Selected model: ${modelId || 'not selected'}.`,
      'Use these notes to make this variant meaningfully different from the other prompt while still obeying the required schema, inputMode, language, and duration.',
      notes,
    ].join('\n');
  }

  async function generateOpenRouterSlot(slotId: OpenRouterGenerationSlotId): Promise<void> {
    const slot = generationSlots[slotId];
    const slotModel = defaultModel;
    const slotLabel = getOpenRouterSlotLabel(slotId);
    const existingJob = activeJobs.some((job) => job.origin === 'custom-workspace' && job.customSlotId === slotId);
    if (existingJob || generateBusySlots[slotId]) return;

    if (!slotModel) {
      const message = `Set a model for ${slotLabel} first.`;
      updateGenerationSlot(slotId, { error: message });
      onCreateGenerationErrorSession({
        slotLabel,
        inputMode: generateInputMode,
        language: generateLanguage,
        message,
      });
      return;
    }

    void requestTrainingNotificationPermission();

    setGenerateBusySlots((current) => ({ ...current, [slotId]: true }));
    updateGenerationSlot(slotId, { error: '' });
    const slotPrompt = buildVariantPrompt(slotId, generatePayloads.prompt, slot, slotModel);
    const slotMaxTokens = getOpenRouterGenerationMaxTokens(generateDurationMinutes);
    const generationStartedAt = new Date().toISOString();
    const promptSize = estimateOpenRouterPromptSize(slotPrompt, {
      promptMode: generatePromptSource,
      durationMinutes: generateDurationMinutes,
      inputMode: generateInputMode,
      language: generateLanguage,
    });
    const wakeLock = await requestOpenRouterWakeLock();
    try {
      const response = await fetch('/api/openrouter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          model: slotModel,
          prompt: slotPrompt,
          maxTokens: slotMaxTokens,
          slotLabel,
          inputMode: generateInputMode,
          language: generateLanguage,
          durationMinutes: generateDurationMinutes,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Generation request failed (${response.status}).`);
      }
      const payload = (await response.json()) as OpenRouterJobResponse;
      const jobId = payload.jobId;
      if (!jobId) throw new Error('OpenRouter job did not return an id.');
      const activeJob: ActiveOpenRouterJob = {
        jobId,
        model: slotModel,
        slotLabel,
        inputMode: generateInputMode,
        language: generateLanguage,
        durationMinutes: generateDurationMinutes,
        promptMode: promptSize.promptMode,
        promptCharacterCount: promptSize.characterCount,
        promptApproximateTokenCount: promptSize.approximateTokenCount,
        origin: 'custom-workspace',
        customSlotId: slotId,
        startedAt: generationStartedAt,
      };
      onTrackJob(activeJob);
      updateGenerationSlot(slotId, {
        inputMode: generateInputMode,
        language: generateLanguage,
        generatedAt: generationStartedAt,
        model: slotModel,
        error: '',
      });
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Failed to reach OpenRouter endpoint. Refresh the page and try a free model such as openrouter/free.'
          : err instanceof Error
            ? err.message
            : 'OpenRouter generation failed.';
      if (isTransientOpenRouterGenerationError(message)) {
        const nowMs = Date.now();
        updateGenerationSlot(slotId, {
          inputMode: generateInputMode,
          language: generateLanguage,
          generatedAt: new Date().toISOString(),
          model: slotModel,
          error: formatInterruptedOpenRouterMessage(
            slotLabel,
            slotModel,
            Math.max(0, nowMs - parseTimestampMs(generationStartedAt, nowMs)),
          ),
        });
        return;
      }
      updateGenerationSlot(slotId, {
        inputMode: generateInputMode,
        language: generateLanguage,
        generatedAt: new Date().toISOString(),
        model: slotModel,
        error: message,
      });
      if (shouldCreatePersistentGenerationErrorSession(message)) {
        onCreateGenerationErrorSession({
          slotLabel,
          inputMode: generateInputMode,
          language: generateLanguage,
          message,
        });
      }
    } finally {
      await releaseOpenRouterWakeLock(wakeLock);
      setGenerateBusySlots((current) => ({ ...current, [slotId]: false }));
    }
  }

  const exportPayloads = useMemo(() => {
    const activeSessionStatus = exportActiveSessionStatus;
    const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(exportProfile), null, 2);
    const llmPrompt = buildDictationScriptPrompt(exportProfile);
    const outputTemplate = buildDictationScriptTemplate(exportProfile.inputMode, exportProfile.language);
    const benchmarkOnlyPackage = `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`;
    const benchmarkFeedbackPackage = buildBenchmarkFeedbackPackage(exportProfile, exportSessionFeedback, { activeSessionStatus }) as Record<
      string,
      unknown
    >;
    const diagnosticPackage = JSON.stringify(benchmarkFeedbackPackage, null, 2);
    const promptPackage = buildBenchmarkFeedbackPromptPackage(exportProfile, exportSessionFeedback, llmPrompt, { activeSessionStatus });
    const sessionFeedbackJson = JSON.stringify(
      buildSessionFeedbackJsonPayload(exportProfile.inputMode, exportProfile.language, exportSessionFeedback, {
        activeSessionStatus,
        fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(exportProfile.timeline.slice(-60)),
      }),
      null,
      2,
    );
    const humanNotesPackage = JSON.stringify(
      {
        ...benchmarkFeedbackPackage,
        llmPrompt,
        humanFeedback: humanFeedbackDraft.trim(),
      },
      null,
      2,
    );

    const compactBenchmark = JSON.stringify(
      {
        profileKey: `${exportProfile.inputMode}/${exportProfile.language}`,
        sessionCount: exportProfile.sessionCount,
        sampleCount: exportProfile.sampleCount,
        lastUpdatedAt: exportProfile.lastUpdatedAt ?? null,
        recommendation: exportProfile.recommendation,
        weakAreas: exportProfile.weakAreas,
        kpis: {
          sweetSpotScore: exportProfile.sweetSpotScore,
          semanticFidelityScore: exportProfile.semanticFidelityScore,
          controlFidelityScore: exportProfile.controlFidelityScore,
          learningEffectivenessScore: exportProfile.learningEffectivenessScore,
          flowStabilityScore: exportProfile.flowStabilityScore,
          averageAccuracy: exportProfile.averageAccuracy,
          averageWpm: exportProfile.averageWpm,
          averageLagSec: exportProfile.averageLagSec,
          preferredPlaybackRate: exportProfile.preferredPlaybackRate,
          preferredPhraseSize: exportProfile.preferredPhraseSize,
        },
      },
      null,
      2,
    );

    const compactSessionFeedback = JSON.stringify(
      exportSessionFeedback
        ? {
            verdict: exportSessionFeedback.verdict,
            improvementDelta: exportSessionFeedback.improvementDelta,
            playbackIssues: {
              repeatedPhraseCount: exportSessionFeedback.playbackIssues.repeatedPhraseCount,
              maxRepeatCountForSinglePhrase: exportSessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase,
              skippedPhraseCount: exportSessionFeedback.playbackIssues.skippedPhraseCount,
              outOfOrderAdvanceCount: exportSessionFeedback.playbackIssues.outOfOrderAdvanceCount,
              replayAdvancedPhraseCount: exportSessionFeedback.playbackIssues.replayAdvancedPhraseCount,
              phraseIndexJumpCount: exportSessionFeedback.playbackIssues.phraseIndexJumpCount,
            },
            phraseStats: exportSessionFeedback.phraseStats,
            notes: exportSessionFeedback.notes.slice(0, 8),
          }
        : { verdict: 'n/a' },
      null,
      2,
    );

    const compactPromptPackage = JSON.stringify(
      {
        benchmark: JSON.parse(compactBenchmark) as Record<string, unknown>,
        latestSessionFeedback: JSON.parse(compactSessionFeedback) as Record<string, unknown>,
        llmPrompt,
      },
      null,
      2,
    );

    return {
      benchmarkJson,
      llmPrompt,
      outputTemplate,
      benchmarkOnlyPackage,
      diagnosticPackage,
      promptPackage,
      sessionFeedbackJson,
      humanNotesPackage,
      compactBenchmark,
      compactSessionFeedback,
      compactPromptPackage,
    };
  }, [exportActiveSessionStatus, exportProfile, exportSessionFeedback, humanFeedbackDraft]);

  const generateProfile =
    benchmarks[generateInputMode]?.[generateLanguage] ?? createEmptyInputLanguageBenchmark(generateInputMode, generateLanguage);
  const generateSessionFeedback = selectLatestAdaptiveSessionFeedback(
    sessionFeedbackByInputLanguage[generateInputMode]?.[generateLanguage],
    generateInputMode,
    generateLanguage,
  );
  const generateHasBenchmarkData = generateProfile.sampleCount > 0 || generateProfile.sessionCount > 0;
  const generateHasSessionFeedback = Boolean(generateSessionFeedback);
  const generatePayloads = useMemo(
    () =>
      buildOpenRouterGenerationPrompt({
        profile: generateProfile,
        sessionFeedback: generateSessionFeedback,
        promptSource: generatePromptSource,
        durationMinutes: generateDurationMinutes,
        userIntent: 'auto',
      }),
    [generateDurationMinutes, generateProfile, generatePromptSource, generateSessionFeedback],
  );
  const activeGenerateSlot = generationSlots[activeGenerateSlotId];
  const activeGenerateSlotModel = defaultModel;
  const activeGenerateSlotPrompt = useMemo(
    () => buildVariantPrompt(activeGenerateSlotId, generatePayloads.prompt, activeGenerateSlot, activeGenerateSlotModel),
    [activeGenerateSlotId, activeGenerateSlot, activeGenerateSlotModel, generatePayloads.prompt],
  );
  const activeGenerateSlotValidation = useMemo<DictationScriptValidationResult | null>(() => {
    if (!activeGenerateSlot.json || !activeGenerateSlot.inputMode || !activeGenerateSlot.language) return null;
    return validateGeneratedScriptForTarget(activeGenerateSlot.json, activeGenerateSlot.inputMode, activeGenerateSlot.language);
  }, [activeGenerateSlot.inputMode, activeGenerateSlot.json, activeGenerateSlot.language]);
  const activeGenerateSlotJob = useMemo(
    () =>
      [...activeJobs]
        .filter((job) => job.origin === 'custom-workspace' && job.customSlotId === activeGenerateSlotId)
        .sort((a, b) => parseTimestampMs(b.startedAt, generationNowMs) - parseTimestampMs(a.startedAt, generationNowMs))[0] ?? null,
    [activeGenerateSlotId, activeJobs, generationNowMs],
  );
  const activeGenerateSlotJobNotice = useMemo<TrainingGenerationNoticeView | null>(() => {
    if (activeGenerateSlotJob) {
      return formatTrainingGenerationNotice({
        slotLabel: activeGenerateSlotJob.slotLabel,
        displayLabel: activeGenerateSlotJob.slotLabel,
        model: activeGenerateSlotJob.model,
        startedAt: activeGenerateSlotJob.startedAt,
        status: 'running',
      }, generationNowMs);
    }

    const latestNotification =
      Object.values(jobNotifications)
        .filter((notification) => notification.slotLabel === getOpenRouterSlotLabel(activeGenerateSlotId))
        .sort((a, b) => parseTimestampMs(b.startedAt, generationNowMs) - parseTimestampMs(a.startedAt, generationNowMs))[0] ?? null;
    if (!latestNotification) return null;

    return formatTrainingGenerationNotice({
      slotLabel: latestNotification.slotLabel,
      displayLabel: latestNotification.slotLabel,
      model: latestNotification.model,
      startedAt: latestNotification.startedAt,
      status: latestNotification.status,
      completedAt: latestNotification.completedAt,
      error: latestNotification.error,
    }, generationNowMs);
  }, [activeGenerateSlotId, activeGenerateSlotJob, generationNowMs, jobNotifications]);
  const activeGenerateSlotBusy = generateBusySlots[activeGenerateSlotId] || Boolean(activeGenerateSlotJob);

  const refreshApiKeyStatus = async (): Promise<void> => {
    if (!LOCAL_DEV_FEATURES_AVAILABLE) {
      setApiKeyConfigured(false);
      setApiKeySuffix('');
      setApiKeyMessage('Hosted builds read OPENROUTER_API_KEY from Vercel environment variables.');
      return;
    }
    try {
      const response = await fetch('/api/openrouter/key/status');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Status request failed (${response.status}).`);
      }
      const payload = (await response.json()) as { configured?: boolean; suffix?: string };
      setApiKeyConfigured(Boolean(payload.configured));
      setApiKeySuffix(typeof payload.suffix === 'string' ? payload.suffix : '');
    } catch (err) {
      setApiKeyConfigured(false);
      setApiKeySuffix('');
      setApiKeyMessage(err instanceof Error ? err.message : 'Failed to read key status.');
    }
  };

  useEffect(() => {
    void refreshApiKeyStatus();
  }, []);

  useEffect(() => {
    setSelectedModel(defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    setGenerateInputMode(LOCAL_DEV_FEATURES_AVAILABLE ? defaultGenerateInputMode : 'browser-tts');
    setGenerateLanguage(defaultGenerateLanguage);
  }, [defaultGenerateInputMode, defaultGenerateLanguage]);

  useEffect(() => {
    if (focusGenerateRequest === 0) return;
    setSectionsExpanded((prev) => ({ ...prev, generate: true }));
    window.setTimeout(() => {
      document.getElementById('openrouter-generate-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [focusGenerateRequest]);

  const exportHasBenchmarkData = exportProfile.sampleCount > 0 || exportProfile.sessionCount > 0;
  const exportHasSessionFeedback = Boolean(exportSessionFeedback);
  const exportLanguage: BenchmarkLanguageButton = isSupportedLanguage(exportProfile.language) ? exportProfile.language : 'en';
  const profileInputModeOptions: Array<{ value: InputMode; label: string; description: string }> = [
    { value: 'audio', label: 'Input #1', description: 'Audio' },
    { value: 'browser-tts', label: 'Input #2', description: 'Browser TTS' },
    { value: 'kokoro', label: 'Input #3', description: 'Kokoro' },
    { value: COSYVOICE_CACHE_INPUT_MODE, label: 'Input #4', description: 'CosyVoice cache' },
  ];
  const generateInputModeOptions = LOCAL_DEV_FEATURES_AVAILABLE
    ? profileInputModeOptions
    : profileInputModeOptions.filter((option) => option.value === 'browser-tts');
  const profileLanguageOptions: Array<{ value: BenchmarkLanguageButton; label: string }> = SUPPORTED_LANGUAGES.map((language) => ({
    value: language,
    label: language.toUpperCase(),
  }));
  const generatePromptSourceOptions: Array<{ value: OpenRouterGeneratePromptSource; label: string; description: string }> = [
    { value: 'compact-adaptive-v2', label: 'Compact adaptive v2', description: 'Reduced-duplication benchmark + feedback prompt.' },
    { value: 'compact-adaptive', label: 'Compact adaptive', description: 'Compact benchmark + compact feedback when available.' },
    { value: 'compact-benchmark-only', label: 'Compact benchmark', description: 'Compact benchmark only; skips latest feedback.' },
    { value: 'compact-base', label: 'Compact base', description: 'Base prompt only; smallest prompt.' },
    { value: 'original-adaptive', label: 'Original adaptive', description: 'Full benchmark + full feedback when available.' },
    { value: 'original-benchmark-only', label: 'Original benchmark', description: 'Full benchmark only; skips latest feedback.' },
    { value: 'original-base', label: 'Original base', description: 'Original base prompt only.' },
  ];
  const generateDurationOptions: Array<2 | 3 | 4> = [2, 3, 4];

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
