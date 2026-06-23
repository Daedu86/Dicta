import { useState } from 'react';
import { useOpenRouterApiKeyStatus } from './useOpenRouterApiKeyStatus';
import { LOCAL_DEV_FEATURES_AVAILABLE } from './openRouterWorkspaceRuntimeConfig';

type UseOpenRouterWorkspaceUiStateArgs = {
  defaultModel: string;
};

export function useOpenRouterWorkspaceUiState({
  defaultModel,
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
  const [sectionsExpanded, setSectionsExpanded] = useState({
    apiKey: true,
    models: true,
    test: true,
    exports: true,
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
    sectionsExpanded,
    setSectionsExpanded,
  };
}
