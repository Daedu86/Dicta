import { useEffect } from 'react';
import { useOpenRouterGenerationSlots } from './useOpenRouterGenerationSlots';
import type { OpenRouterWorkspaceProps } from './types';
import { formatOpenRouterPromptSizeHint } from './openRouterWorkspaceRuntimeHelpers';
import { LOCAL_DEV_FEATURES_AVAILABLE } from './openRouterWorkspaceRuntimeConfig';
import { useOpenRouterWorkspaceClipboard } from './useOpenRouterWorkspaceClipboard';
import { useOpenRouterWorkspaceDerivations } from './useOpenRouterWorkspaceDerivations';
import { useOpenRouterWorkspaceSlotGeneration } from './useOpenRouterWorkspaceSlotGeneration';
import { useOpenRouterWorkspaceUiState } from './useOpenRouterWorkspaceUiState';

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
  const uiState = useOpenRouterWorkspaceUiState({
    defaultModel,
    defaultGenerateInputMode,
    defaultGenerateLanguage,
  });
  const {
    generationSlots,
    generateBusySlots,
    setGenerateBusySlots,
    updateGenerationSlot,
    clearGeneratedScriptDraft,
  } = useOpenRouterGenerationSlots(defaultModel);

  const derivations = useOpenRouterWorkspaceDerivations({
    defaultModel,
    assignedModel,
    models,
    exportActiveSessionStatus,
    exportProfile,
    exportSessionFeedback,
    benchmarks,
    sessionFeedbackByInputLanguage,
    activeJobs,
    jobNotifications,
    generationNowMs,
    generationSlots,
    generateBusySlots,
    humanFeedbackDraft: uiState.humanFeedbackDraft,
    generateInputMode: uiState.generateInputMode,
    generateLanguage: uiState.generateLanguage,
    generatePromptSource: uiState.generatePromptSource,
    generateDurationMinutes: uiState.generateDurationMinutes,
    activeGenerateSlotId: uiState.activeGenerateSlotId,
  });

  const copyToClipboard = useOpenRouterWorkspaceClipboard({
    exportProfile,
    setExportStatusMessage: uiState.setExportStatusMessage,
  });

  const { generateOpenRouterSlot } = useOpenRouterWorkspaceSlotGeneration({
    defaultModel,
    authHeaders,
    activeJobs,
    onTrackJob,
    onCreateGenerationErrorSession,
    generationSlots,
    generateBusySlots,
    setGenerateBusySlots,
    updateGenerationSlot,
    generateInputMode: uiState.generateInputMode,
    generateLanguage: uiState.generateLanguage,
    generatePromptSource: uiState.generatePromptSource,
    generateDurationMinutes: uiState.generateDurationMinutes,
    generatePayloadPrompt: derivations.generatePayloads.prompt,
  });

  useEffect(() => {
    uiState.setSelectedModel(defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    uiState.setGenerateInputMode(LOCAL_DEV_FEATURES_AVAILABLE ? defaultGenerateInputMode : 'browser-tts');
    uiState.setGenerateLanguage(defaultGenerateLanguage);
  }, [defaultGenerateInputMode, defaultGenerateLanguage]);

  useEffect(() => {
    if (focusGenerateRequest === 0) return;
    uiState.setSectionsExpanded((prev) => ({ ...prev, generate: true }));
    window.setTimeout(() => {
      document.getElementById('openrouter-generate-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [focusGenerateRequest]);

  return {
    ...uiState,
    generationSlots,
    generateBusySlots,
    modelSelectionLocked: derivations.modelSelectionLocked,
    modelOptions: derivations.modelOptions,
    copyToClipboard,
    formatPromptSizeHint: formatOpenRouterPromptSizeHint,
    clearGeneratedScriptDraft,
    generateOpenRouterSlot,
    exportPayloads: derivations.exportPayloads,
    generateHasBenchmarkData: derivations.generateHasBenchmarkData,
    generateHasSessionFeedback: derivations.generateHasSessionFeedback,
    activeGenerateSlot: derivations.activeGenerateSlot,
    activeGenerateSlotModel: derivations.activeGenerateSlotModel,
    activeGenerateSlotPrompt: derivations.activeGenerateSlotPrompt,
    activeGenerateSlotValidation: derivations.activeGenerateSlotValidation,
    activeGenerateSlotJob: derivations.activeGenerateSlotJob,
    activeGenerateSlotJobNotice: derivations.activeGenerateSlotJobNotice,
    activeGenerateSlotBusy: derivations.activeGenerateSlotBusy,
    exportHasBenchmarkData: derivations.exportHasBenchmarkData,
    exportHasSessionFeedback: derivations.exportHasSessionFeedback,
    exportLanguage: derivations.exportLanguage,
    profileInputModeOptions: derivations.profileInputModeOptions,
    generateInputModeOptions: derivations.generateInputModeOptions,
    profileLanguageOptions: derivations.profileLanguageOptions,
    generatePromptSourceOptions: derivations.generatePromptSourceOptions,
    generateDurationOptions: derivations.generateDurationOptions,
  };
}
