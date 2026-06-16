import { useState } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import type { OpenRouterGeneratePromptSource } from '../../core/adaptive/openRouterGenerationPrompt';
import type { BenchmarkLanguageButton, OpenRouterGenerationSlotId } from './types';
import { useOpenRouterApiKeyStatus } from './useOpenRouterApiKeyStatus';
import { LOCAL_DEV_FEATURES_AVAILABLE } from './openRouterWorkspaceRuntimeConfig';

type UseOpenRouterWorkspaceUiStateArgs = {
  defaultModel: string;
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
};

export function useOpenRouterWorkspaceUiState({
  defaultModel,
  defaultGenerateInputMode,
  defaultGenerateLanguage,
}: UseOpenRouterWorkspaceUiStateArgs) {
  const apiKeyStatus = useOpenRouterApiKeyStatus(LOCAL_DEV_FEATURES_AVAILABLE);
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
  const [sectionsExpanded, setSectionsExpanded] = useState({
    apiKey: true,
    models: true,
    test: true,
    exports: true,
    generate: true,
  });

  return {
    ...apiKeyStatus,
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
    sectionsExpanded,
    setSectionsExpanded,
  };
}
