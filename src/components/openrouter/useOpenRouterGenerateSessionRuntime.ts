import { useEffect, useState } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import type { OpenRouterGeneratePromptSource } from '../../core/adaptive/openRouterGenerationPrompt';
import { formatOpenRouterPromptSizeHint } from './openRouterWorkspaceRuntimeHelpers';
import { LOCAL_DEV_FEATURES_AVAILABLE } from './openRouterWorkspaceRuntimeConfig';
import { useOpenRouterGeneratePromptDerivations } from './useOpenRouterGeneratePromptDerivations';
import { useOpenRouterGenerateSlotDerivations } from './useOpenRouterGenerateSlotDerivations';
import { useOpenRouterGenerationSlots } from './useOpenRouterGenerationSlots';
import { useOpenRouterWorkspaceSlotGeneration } from './useOpenRouterWorkspaceSlotGeneration';
import {
  OPEN_ROUTER_GENERATE_DURATION_OPTIONS,
  OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS,
  OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS,
  OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
} from './openRouterWorkspaceRuntimeHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterWorkspaceProps,
} from './types';

export const OPENROUTER_GENERATE_SESSION_CARD_ID = 'adaptive-flow-generation-session-card';

type UseOpenRouterGenerateSessionRuntimeArgs = Pick<
  OpenRouterWorkspaceProps,
  | 'defaultModel'
  | 'authHeaders'
  | 'benchmarks'
  | 'sessionFeedbackByInputLanguage'
  | 'defaultGenerateInputMode'
  | 'defaultGenerateLanguage'
  | 'focusGenerateRequest'
  | 'activeJobs'
  | 'jobNotifications'
  | 'generationNowMs'
  | 'onTrackJob'
  | 'onCreateGenerationErrorSession'
>;

export function useOpenRouterGenerateSessionRuntime({
  defaultModel,
  authHeaders,
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
}: UseOpenRouterGenerateSessionRuntimeArgs) {
  const [generateInputMode, setGenerateInputMode] = useState<InputMode>(defaultGenerateInputMode);
  const [generateLanguage, setGenerateLanguage] = useState<BenchmarkLanguageButton>(defaultGenerateLanguage);
  const [generatePromptSource, setGeneratePromptSource] = useState<OpenRouterGeneratePromptSource>('compact-adaptive');
  const [generateDurationMinutes, setGenerateDurationMinutes] = useState<2 | 3 | 4>(3);
  const [activeGenerateSlotId, setActiveGenerateSlotId] = useState<OpenRouterGenerationSlotId>('prompt1');
  const {
    generationSlots,
    generateBusySlots,
    setGenerateBusySlots,
    updateGenerationSlot,
    clearGeneratedScriptDraft,
  } = useOpenRouterGenerationSlots(defaultModel);

  const {
    generatePayloads,
    generateHasBenchmarkData,
    generateHasSessionFeedback,
  } = useOpenRouterGeneratePromptDerivations({
    benchmarks,
    sessionFeedbackByInputLanguage,
    generateInputMode,
    generateLanguage,
    generatePromptSource,
    generateDurationMinutes,
  });

  const activeGenerateSlotModel = defaultModel;
  const {
    activeGenerateSlot,
    activeGenerateSlotPrompt,
    activeGenerateSlotValidation,
    activeGenerateSlotJob,
    activeGenerateSlotJobNotice,
    activeGenerateSlotBusy,
  } = useOpenRouterGenerateSlotDerivations({
    activeJobs,
    jobNotifications,
    generationNowMs,
    generationSlots,
    generateBusySlots,
    activeGenerateSlotId,
    activeGenerateSlotModel,
    generatePrompt: generatePayloads.prompt,
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
    generateInputMode,
    generateLanguage,
    generatePromptSource,
    generateDurationMinutes,
    generatePayloadPrompt: generatePayloads.prompt,
  });

  useEffect(() => {
    setGenerateInputMode(LOCAL_DEV_FEATURES_AVAILABLE ? defaultGenerateInputMode : 'browser-tts');
    setGenerateLanguage(defaultGenerateLanguage);
  }, [defaultGenerateInputMode, defaultGenerateLanguage]);

  useEffect(() => {
    if (focusGenerateRequest === 0) return;
    window.setTimeout(() => {
      document.getElementById(OPENROUTER_GENERATE_SESSION_CARD_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [focusGenerateRequest]);

  const generateInputModeOptions = LOCAL_DEV_FEATURES_AVAILABLE
    ? OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS
    : OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS.filter((option) => option.value === 'browser-tts');

  return {
    generationSlots,
    generateBusySlots,
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
    formatPromptSizeHint: formatOpenRouterPromptSizeHint,
    clearGeneratedScriptDraft,
    generateOpenRouterSlot,
    generateHasBenchmarkData,
    generateHasSessionFeedback,
    activeGenerateSlot,
    activeGenerateSlotModel,
    activeGenerateSlotPrompt,
    activeGenerateSlotValidation,
    activeGenerateSlotJob,
    activeGenerateSlotJobNotice,
    activeGenerateSlotBusy,
    generateInputModeOptions,
    profileLanguageOptions: OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
    generatePromptSourceOptions: OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS,
    generateDurationOptions: OPEN_ROUTER_GENERATE_DURATION_OPTIONS,
  };
}

export type OpenRouterGenerateSessionRuntime = ReturnType<typeof useOpenRouterGenerateSessionRuntime>;
