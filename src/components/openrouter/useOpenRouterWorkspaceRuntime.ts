import { useEffect, useMemo, useRef, useState } from 'react';
import type { InputMode } from '../../core/adaptive/types';
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
import {
  buildOpenRouterModelOptions,
  createEmptyOpenRouterGenerationSlot,
  createEmptyOpenRouterGenerationSlots,
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

export function useOpenRouterWorkspaceRuntime({
  defaultModel,
  assignedModel,
  authHeaders,
  models,
  exportProfile,
  exportSessionFeedback,
  exportActiveSessionStatus,
  benchmarks,
  sessionFeedbackByInputLanguage,
  defaultGenerateInputMode,
  defaultGenerateLanguage,
  focusGenerateRequest,
  activeJobs,
  jobNotifications,
  generationNowMs,
  onTrackJob,
  onCreateGenerationErrorSession,
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
    { value: 'browser-tts', label: 'Browser TTS', description: 'Browser SpeechSynthesis' },
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
  return {
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
  };
}
