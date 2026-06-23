#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d .git || ! -d src || ! -d docs ]]; then
  echo "Run this from the Dicta repo root."
  exit 1
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "product/input-2" ]]; then
  echo "Current branch is '$current_branch'. Switch to product/input-2 before applying."
  exit 1
fi

cat > src/components/openrouter/OpenRouterWorkspace.tsx <<'TSX'
import { OpenRouterApiKeySection } from './OpenRouterApiKeySection';
import { OpenRouterCollapsibleSection } from './OpenRouterCollapsibleSection';
import { OpenRouterModelTestSection } from './OpenRouterModelTestSection';
import { OpenRouterModelsSection } from './OpenRouterModelsSection';
import { OpenRouterWorkspaceHeader } from './OpenRouterWorkspaceHeader';
import type { OpenRouterWorkspaceProps } from './types';
import { useOpenRouterWorkspaceRuntime } from './useOpenRouterWorkspaceRuntime';
import type { OpenRouterWorkspaceSectionId } from './openRouterWorkspaceRuntimeTypes';

const sectionTitles = {
  apiKey: 'Section # 1 API Key',
  models: 'Section # 2 Free Models',
  test: 'Section # 3 Testing model',
};

const O = (props: OpenRouterWorkspaceProps) => {
  const runtime = useOpenRouterWorkspaceRuntime(props);

  const toggleSection = (sectionId: OpenRouterWorkspaceSectionId) => {
    runtime.setSectionsExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <section className="panel workspace-panel admin-workspace">
      <OpenRouterWorkspaceHeader onBackToTraining={props.onBackToTraining} />

      <OpenRouterCollapsibleSection title={sectionTitles.apiKey} expanded={runtime.sectionsExpanded.apiKey} onToggle={() => toggleSection('apiKey')}>
        <OpenRouterApiKeySection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.models} expanded={runtime.sectionsExpanded.models} onToggle={() => toggleSection('models')}>
        <OpenRouterModelsSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.test} expanded={runtime.sectionsExpanded.test} onToggle={() => toggleSection('test')}>
        <OpenRouterModelTestSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>
    </section>
  );
};

export { O as OpenRouterWorkspace };
TSX

cat > src/components/openrouter/useOpenRouterWorkspaceRuntime.ts <<'TS'
import { useEffect, useMemo } from 'react';
import type { OpenRouterWorkspaceProps } from './types';
import { buildOpenRouterModelOptions } from './openRouterViewHelpers';
import { useOpenRouterWorkspaceUiState } from './useOpenRouterWorkspaceUiState';

export function useOpenRouterWorkspaceRuntime({
  defaultModel,
  assignedModel,
  models,
}: OpenRouterWorkspaceProps) {
  const uiState = useOpenRouterWorkspaceUiState({
    defaultModel,
  });

  const modelSelectionLocked = Boolean(assignedModel);
  const modelOptions = useMemo(
    () => buildOpenRouterModelOptions(models, [defaultModel, assignedModel]),
    [assignedModel, defaultModel, models],
  );

  useEffect(() => {
    uiState.setSelectedModel(defaultModel);
  }, [defaultModel]);

  return {
    ...uiState,
    modelSelectionLocked,
    modelOptions,
  };
}
TS

cat > src/components/openrouter/useOpenRouterWorkspaceUiState.ts <<'TS'
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
  const [sectionsExpanded, setSectionsExpanded] = useState({
    apiKey: true,
    models: true,
    test: true,
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
    sectionsExpanded,
    setSectionsExpanded,
  };
}
TS

cat > src/components/openrouter/openRouterWorkspaceRuntimeHelpers.ts <<'TS'
import type { InputMode } from '../../core/adaptive/types';
import type { OpenRouterGeneratePromptSource } from '../../core/adaptive/openRouterGenerationPrompt';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import { getOpenRouterSlotLabel } from './openRouterViewHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlotState,
} from './types';

export const OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS: Array<{ value: InputMode; label: string; description: string }> = [
  { value: 'browser-tts', label: 'Browser TTS', description: 'Browser SpeechSynthesis' },
];

export const OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS: Array<{ value: BenchmarkLanguageButton; label: string }> = SUPPORTED_LANGUAGES.map((language) => ({
  value: language,
  label: language.toUpperCase(),
}));

export const OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS: Array<{ value: OpenRouterGeneratePromptSource; label: string; description: string }> = [
  { value: 'compact-adaptive-v2', label: 'Compact adaptive v2', description: 'Reduced-duplication benchmark + feedback prompt.' },
  { value: 'compact-adaptive', label: 'Compact adaptive', description: 'Compact benchmark + compact feedback when available.' },
  { value: 'compact-benchmark-only', label: 'Compact benchmark', description: 'Compact benchmark only; skips latest feedback.' },
  { value: 'compact-base', label: 'Compact base', description: 'Base prompt only; smallest prompt.' },
  { value: 'original-adaptive', label: 'Original adaptive', description: 'Full benchmark + full feedback when available.' },
  { value: 'original-benchmark-only', label: 'Original benchmark', description: 'Full benchmark only; skips latest feedback.' },
  { value: 'original-base', label: 'Original base', description: 'Original base prompt only.' },
];

export const OPEN_ROUTER_GENERATE_DURATION_OPTIONS: Array<2 | 3 | 4> = [2, 3, 4];

export function formatOpenRouterPromptSizeHint(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'Words: 0 · Tokens: ~0';
  const words = normalized.split(/\s+/).filter(Boolean).length;
  const chars = normalized.length;
  const estimatedTokens = Math.max(1, Math.round(chars / 4));
  return `Words: ${words} · Tokens: ~${estimatedTokens}`;
}

export function buildOpenRouterWorkspaceVariantPrompt(
  slotId: OpenRouterGenerationSlotId,
  basePrompt: string,
  slot: OpenRouterGenerationSlotState,
  modelId: string,
): string {
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
TS

cat > src/components/openrouter/types.ts <<'TS'
import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode } from '../../core/adaptive/types';
import type { SupportedLanguage } from '../../core/languages';

export type OpenRouterJobNotification = {
  jobId: string;
  slotLabel: string;
  model: string;
  startedAt: string;
  status: 'running' | 'succeeded' | 'failed';
  completedAt?: string;
  error?: string;
};

export type OpenRouterModelSummary = { id: string; name?: string; context_length?: number };

export type TrainingGenerationNotice = {
  slotLabel: string;
  displayLabel: string;
  model: string;
  startedAt: string;
  status: 'running' | 'succeeded' | 'failed';
  completedAt?: string;
  error?: string;
};

export type TrainingGenerationNoticeView = {
  message: string;
  tone: 'hint' | 'success' | 'error';
};

export type AdaptiveBenchmarksByInputLanguage = Record<string, Record<string, InputLanguageBenchmarkMetrics>>;
export type AdaptiveSessionFeedbackByInputLanguage = Record<string, Record<string, AdaptiveSessionFeedback[]>>;
export type BenchmarkLanguageButton = SupportedLanguage;

export type PersistedOpenRouterGeneration = {
  text: string;
  json: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  elapsedMs: number | null;
};

export type OpenRouterGenerationSlotId = 'prompt1' | 'prompt2';

export type OpenRouterGenerationUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type OpenRouterGenerationSlotState = {
  notes: string;
  model: string;
  text: string;
  json: string;
  inputMode: InputMode | null;
  language: BenchmarkLanguageButton | null;
  usage: OpenRouterGenerationUsage | null;
  elapsedMs: number | null;
  generatedAt: string | null;
  error: string;
};

export type OpenRouterGenerationSlots = Record<OpenRouterGenerationSlotId, OpenRouterGenerationSlotState>;

export type OpenRouterWorkspaceProps = {
  defaultModel: string;
  assignedModel: string | null;
  authHeaders: Record<string, string>;
  onSetDefaultModel: (value: string) => void;
  models: OpenRouterModelSummary[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  onRefreshModels: () => Promise<void>;
  onBackToTraining: () => void;
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  sessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
  focusGenerateRequest: number;
  activeJobs: ActiveOpenRouterJob[];
  jobNotifications: Record<string, OpenRouterJobNotification>;
  generationNowMs: number;
  onTrackJob: (job: ActiveOpenRouterJob) => void;
  onCreateGenerationErrorSession: (args: {
    slotLabel: string;
    inputMode: InputMode;
    language: BenchmarkLanguageButton;
    message: string;
  }) => void;
};
TS

cat > src/app/openRouterWorkspacePropsBuilders.ts <<'TS'
import type { OpenRouterWorkspaceProps } from '../components/openrouter/types';
import { persistOpenRouterDefaultModel } from './modelPreferenceStorage';
import type { UseOpenRouterWorkspacePropsArgs } from './useOpenRouterWorkspaceProps';

type OpenRouterWorkspaceModelArgs = Pick<
  UseOpenRouterWorkspacePropsArgs,
  'defaultModel' | 'assignedModel' | 'getAuthHeaders' | 'setOpenRouterDefaultModel'
>;

export function buildOpenRouterWorkspaceProps(args: UseOpenRouterWorkspacePropsArgs): OpenRouterWorkspaceProps {
  const {
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
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
  } = args;

  return {
    ...buildOpenRouterWorkspaceModelProps(args),
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
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
  };
}

function buildOpenRouterWorkspaceModelProps({
  defaultModel,
  assignedModel,
  getAuthHeaders,
  setOpenRouterDefaultModel,
}: OpenRouterWorkspaceModelArgs): Pick<
  OpenRouterWorkspaceProps,
  'defaultModel' | 'assignedModel' | 'authHeaders' | 'onSetDefaultModel'
> {
  return {
    defaultModel,
    assignedModel: assignedModel || null,
    authHeaders: getAuthHeaders(),
    onSetDefaultModel: (value: string) => {
      setOpenRouterDefaultModel(value);
      persistOpenRouterDefaultModel(value);
    },
  };
}
TS

cat > src/app/useOpenRouterWorkspaceProps.ts <<'TS'
import { useMemo } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  BenchmarkLanguageButton,
  OpenRouterJobNotification,
  OpenRouterWorkspaceProps,
} from '../components/openrouter/types';
import { buildOpenRouterWorkspaceProps } from './openRouterWorkspacePropsBuilders';

export type UseOpenRouterWorkspacePropsArgs = {
  defaultModel: string;
  assignedModel: string;
  getAuthHeaders: () => Record<string, string>;
  setOpenRouterDefaultModel: (value: string) => void;
  models: OpenRouterWorkspaceProps['models'];
  status: OpenRouterWorkspaceProps['status'];
  error: string;
  onRefreshModels: () => Promise<void>;
  onBackToTraining: () => void;
  benchmarks: OpenRouterWorkspaceProps['benchmarks'];
  sessionFeedbackByInputLanguage: OpenRouterWorkspaceProps['sessionFeedbackByInputLanguage'];
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
  focusGenerateRequest: number;
  activeJobs: ActiveOpenRouterJob[];
  jobNotifications: Record<string, OpenRouterJobNotification>;
  generationNowMs: number;
  onTrackJob: (job: ActiveOpenRouterJob) => void;
  onCreateGenerationErrorSession: OpenRouterWorkspaceProps['onCreateGenerationErrorSession'];
};

export function useOpenRouterWorkspaceProps(args: UseOpenRouterWorkspacePropsArgs): OpenRouterWorkspaceProps {
  const {
    defaultModel,
    assignedModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
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
  } = args;

  return useMemo(() => buildOpenRouterWorkspaceProps(args), [
    defaultModel,
    assignedModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
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
  ]);
}
TS

cat > src/app/useWorkspacePanelPropsRuntime.ts <<'TS'
import { useOpenRouterWorkspaceProps } from './useOpenRouterWorkspaceProps';
import { useAdminWorkspaceProps } from './useAdminWorkspaceProps';
import type { UseWorkspacePanelPropsRuntimeArgs } from './useWorkspacePanelPropsRuntimeTypes';

export type { UseWorkspacePanelPropsRuntimeArgs } from './useWorkspacePanelPropsRuntimeTypes';

export function useWorkspacePanelPropsRuntime({
  effectiveOpenRouterDefaultModel,
  assignedOpenRouterModel,
  getAuthHeaders,
  setOpenRouterDefaultModel,
  openRouterModels,
  openRouterStatus,
  openRouterError,
  refreshOpenRouterModels,
  showLeaderboardWorkspace,

  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  selectedBenchmarkInputMode,
  selectedBenchmarkLanguage,
  openRouterGenerateFocusRequest,
  activeOpenRouterJobs,
  openRouterJobNotifications,
  trainingGenerationNowMs,
  trackOpenRouterJob,
  createOpenRouterErrorSession,

  adminSessions,
  adminStorageSummary,
  adminFileInventory,
  adminFileInventoryError,
  exportMessage,
  supabaseSyncStatus,
  adminLanguageView,
  setAdminLanguageView,
  importDictaLocalStorageSnapshot,
  appProfile,
  visibleProfiles,
  adminProfileSessionCounts,
  adminProfileFilter,
  setAdminProfileFilter,
  updateAdminProfileAccess,
  adminRemoteStatus,
  setExportMessage,
}: UseWorkspacePanelPropsRuntimeArgs) {
  const openRouterWorkspaceProps = useOpenRouterWorkspaceProps({
    defaultModel: effectiveOpenRouterDefaultModel,
    assignedModel: assignedOpenRouterModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models: openRouterModels,
    status: openRouterStatus,
    error: openRouterError,
    onRefreshModels: refreshOpenRouterModels,
    onBackToTraining: showLeaderboardWorkspace,
    benchmarks: adaptiveBenchmarksByInputLanguage,
    sessionFeedbackByInputLanguage: adaptiveSessionFeedbackByInputLanguage,
    defaultGenerateInputMode: selectedBenchmarkInputMode,
    defaultGenerateLanguage: selectedBenchmarkLanguage,
    focusGenerateRequest: openRouterGenerateFocusRequest,
    activeJobs: activeOpenRouterJobs,
    jobNotifications: openRouterJobNotifications,
    generationNowMs: trainingGenerationNowMs,
    onTrackJob: trackOpenRouterJob,
    onCreateGenerationErrorSession: createOpenRouterErrorSession,
  });

  const adminWorkspaceProps = useAdminWorkspaceProps({
    sessions: adminSessions,
    summary: adminStorageSummary,
    fileInventory: adminFileInventory,
    fileInventoryError: adminFileInventoryError,
    exportMessage,
    syncStatus: supabaseSyncStatus,
    languageView: adminLanguageView,
    onChangeLanguage: setAdminLanguageView,
    onBackToTraining: showLeaderboardWorkspace,
    onImportLocalStorage: importDictaLocalStorageSnapshot,
    appProfile,
    visibleProfiles,
    profileSessionCounts: adminProfileSessionCounts,
    selectedProfileFilter: adminProfileFilter,
    onChangeProfileFilter: setAdminProfileFilter,
    onUpdateProfileAccess: updateAdminProfileAccess,
    getAuthHeaders,
    remoteAdminStatus: adminRemoteStatus,
    openRouterModels,
    openRouterModelStatus: openRouterStatus,
    openRouterModelError: openRouterError,
    onRefreshOpenRouterModels: refreshOpenRouterModels,
    setExportMessage,
  });

  return {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
  };
}
TS

cat > src/app/useWorkspacePanelPropsRuntimeTypes.ts <<'TS'
import type { useAdminWorkspaceProps } from './useAdminWorkspaceProps';
import type { useOpenRouterWorkspaceProps } from './useOpenRouterWorkspaceProps';

export type OpenRouterWorkspacePropsArgs = Parameters<typeof useOpenRouterWorkspaceProps>[0];
export type AdminWorkspacePropsArgs = Parameters<typeof useAdminWorkspaceProps>[0];

export type UseWorkspacePanelPropsRuntimeArgs = {
  effectiveOpenRouterDefaultModel: OpenRouterWorkspacePropsArgs['defaultModel'];
  assignedOpenRouterModel: OpenRouterWorkspacePropsArgs['assignedModel'];
  getAuthHeaders: OpenRouterWorkspacePropsArgs['getAuthHeaders'];
  setOpenRouterDefaultModel: OpenRouterWorkspacePropsArgs['setOpenRouterDefaultModel'];
  openRouterModels: OpenRouterWorkspacePropsArgs['models'];
  openRouterStatus: OpenRouterWorkspacePropsArgs['status'];
  openRouterError: OpenRouterWorkspacePropsArgs['error'];
  refreshOpenRouterModels: OpenRouterWorkspacePropsArgs['onRefreshModels'];
  showLeaderboardWorkspace: OpenRouterWorkspacePropsArgs['onBackToTraining'];

  adaptiveBenchmarksByInputLanguage: OpenRouterWorkspacePropsArgs['benchmarks'];
  adaptiveSessionFeedbackByInputLanguage: OpenRouterWorkspacePropsArgs['sessionFeedbackByInputLanguage'];
  selectedBenchmarkInputMode: OpenRouterWorkspacePropsArgs['defaultGenerateInputMode'];
  selectedBenchmarkLanguage: OpenRouterWorkspacePropsArgs['defaultGenerateLanguage'];
  openRouterGenerateFocusRequest: OpenRouterWorkspacePropsArgs['focusGenerateRequest'];
  activeOpenRouterJobs: OpenRouterWorkspacePropsArgs['activeJobs'];
  openRouterJobNotifications: OpenRouterWorkspacePropsArgs['jobNotifications'];
  trainingGenerationNowMs: OpenRouterWorkspacePropsArgs['generationNowMs'];
  trackOpenRouterJob: OpenRouterWorkspacePropsArgs['onTrackJob'];
  createOpenRouterErrorSession: OpenRouterWorkspacePropsArgs['onCreateGenerationErrorSession'];

  adminSessions: AdminWorkspacePropsArgs['sessions'];
  adminStorageSummary: AdminWorkspacePropsArgs['summary'];
  adminFileInventory: AdminWorkspacePropsArgs['fileInventory'];
  adminFileInventoryError: AdminWorkspacePropsArgs['fileInventoryError'];
  exportMessage: AdminWorkspacePropsArgs['exportMessage'];
  supabaseSyncStatus: AdminWorkspacePropsArgs['syncStatus'];
  adminLanguageView: AdminWorkspacePropsArgs['languageView'];
  setAdminLanguageView: AdminWorkspacePropsArgs['onChangeLanguage'];
  importDictaLocalStorageSnapshot: AdminWorkspacePropsArgs['onImportLocalStorage'];
  appProfile: AdminWorkspacePropsArgs['appProfile'];
  visibleProfiles: AdminWorkspacePropsArgs['visibleProfiles'];
  adminProfileSessionCounts: AdminWorkspacePropsArgs['profileSessionCounts'];
  adminProfileFilter: AdminWorkspacePropsArgs['selectedProfileFilter'];
  setAdminProfileFilter: AdminWorkspacePropsArgs['onChangeProfileFilter'];
  updateAdminProfileAccess: AdminWorkspacePropsArgs['onUpdateProfileAccess'];
  adminRemoteStatus: AdminWorkspacePropsArgs['remoteAdminStatus'];
  setExportMessage: AdminWorkspacePropsArgs['setExportMessage'];
};
TS

cat > src/app/appPresentationRuntimeInput.ts <<'TS'
import type { useAppPresentationRuntime } from './useAppPresentationRuntime';
import type { DictaAppRouteCompositionRuntimeParams } from './dictaAppRouteCompositionTypes';

type AppPresentationRuntimeInput = Parameters<typeof useAppPresentationRuntime>[0];
type GroupedAppPresentationRuntimeInput = Extract<
  AppPresentationRuntimeInput,
  { liveMetricsDock: unknown }
>;
type LiveMetricsDockInput = GroupedAppPresentationRuntimeInput['liveMetricsDock'];

type RouteDerivedPresentationInput = Pick<
  LiveMetricsDockInput,
  | 'insightsDiagnosticInputOptions'
  | 'copyInsightsDiagnosticPackage'
  | 'selectInsightsDiagnosticFallbackReport'
>;

export function buildAppPresentationRuntimeInput(
  params: DictaAppRouteCompositionRuntimeParams,
  routeDerived: RouteDerivedPresentationInput,
): AppPresentationRuntimeInput {
  const source = { ...params, ...routeDerived };

  return {
    workspacePanels: source,
    appShellHeader: {
      ...source,
      authRequired: params.syncConfig.authRequired,
    },
    authWorkspace: source,
    sessionCreateCard: {
      ...source,
      allowDictationScriptCreation: params.isCurrentProfileAdmin || !params.syncConfig.authRequired,
    },
    liveMetricsDock: source,
  };
}
TS

cat > src/app/dictaAppRouteCompositionTypes.ts <<'TS'
import type { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import type { useAppPresentationRuntime } from './useAppPresentationRuntime';

type AdaptiveWorkspaceRouteRuntimeArgs = Parameters<typeof useAdaptiveWorkspaceRouteRuntime>[0];
type AppPresentationRuntimeArgs = Parameters<typeof useAppPresentationRuntime>[0];

type FlatAdaptiveWorkspaceRouteRuntimeArgs = Exclude<
  AdaptiveWorkspaceRouteRuntimeArgs,
  { presentation: unknown }
>;

type FlatAppPresentationRuntimeArgs = Exclude<
  AppPresentationRuntimeArgs,
  { workspacePanels: unknown }
>;

type RouteDerivedLiveMetricsDockKey =
  | 'insightsDiagnosticInputOptions'
  | 'copyInsightsDiagnosticPackage'
  | 'selectInsightsDiagnosticFallbackReport';

export type DictaAppRouteCompositionRuntimeParams =
  FlatAdaptiveWorkspaceRouteRuntimeArgs &
  Omit<
    FlatAppPresentationRuntimeArgs,
    | RouteDerivedLiveMetricsDockKey
    | 'authRequired'
    | 'allowDictationScriptCreation'
  > & {
    currentPath: string;
    syncConfig: { authRequired: boolean };
    localDevFeaturesAvailable: boolean;
  };
TS

cat > src/app/useDictaAppRouteCompositionRuntime.ts <<'TS'
import { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import { useAppPresentationRuntime } from './useAppPresentationRuntime';
import { buildAdaptiveWorkspaceRouteRuntimeInput } from './adaptiveWorkspaceRouteRuntimeInput';
import { buildAppPresentationRuntimeInput } from './appPresentationRuntimeInput';
import type { DictaAppRouteCompositionRuntimeParams } from './dictaAppRouteCompositionTypes';

export function useDictaAppRouteCompositionRuntime(params: DictaAppRouteCompositionRuntimeParams) {
  const { currentPath } = params;

  const {
    insightsDiagnosticInputOptions,
    copyInsightsDiagnosticPackage,
    selectInsightsDiagnosticFallbackReport,
  } = useAdaptiveWorkspaceRouteRuntime(buildAdaptiveWorkspaceRouteRuntimeInput(params));
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';

  const {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  } = useAppPresentationRuntime(
    buildAppPresentationRuntimeInput(params, {
      insightsDiagnosticInputOptions,
      copyInsightsDiagnosticPackage,
      selectInsightsDiagnosticFallbackReport,
    }),
  );

  return {
    isFocusedTrainingRoute,
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  };
}
TS

python - <<'PY'
from pathlib import Path

# Remove the now-deleted CSS module from the cascade manifest.
path = Path('src/styles/index.css')
text = path.read_text()
text = text.replace("@import './adaptive/export-panels.css';\n", '')
path.write_text(text)

# Keep the source-of-truth architecture doc current and concise.
path = Path('docs/architecture.md')
text = path.read_text()
text = text.replace('adaptive flow/OpenRouter export styles', 'adaptive flow/OpenRouter controls styles')
text = text.replace('OpenRouter context/export behavior', 'OpenRouter generation context behavior')
text = text.replace(
    'OpenRouter workspace: OpenRouter API key, model selection, model test, and export/copy actions.',
    'OpenRouter workspace: OpenRouter API key, model selection, and model test.',
)
path.write_text(text)

# Update the workspace-content regression test and fixture props.
path = Path('tests/appWorkspaceContent.test.ts')
text = path.read_text()
text = text.replace(
    "it('keeps Generate Training Session out of the OpenRouter workspace', () => {",
    "it('keeps Generate Training Session and export/copy actions out of the OpenRouter workspace', () => {",
)
text = text.replace(
    "    expect(host.textContent).toContain('Section # 1 API Key');\n"
    "    expect(host.textContent).toContain('Section # 4 Export / Copy Actions');\n"
    "    expect(host.textContent).not.toContain('Section # 5 Generate Training Session');\n"
    "    expect(host.textContent).not.toContain('Prompt sent to OpenRouter');\n",
    "    expect(host.textContent).toContain('Section # 1 API Key');\n"
    "    expect(host.textContent).toContain('Section # 2 Free Models');\n"
    "    expect(host.textContent).toContain('Section # 3 Testing model');\n"
    "    expect(host.textContent).not.toContain('Section # 4 Export / Copy Actions');\n"
    "    expect(host.textContent).not.toContain('Copy Benchmark JSON');\n"
    "    expect(host.textContent).not.toContain('Section # 5 Generate Training Session');\n"
    "    expect(host.textContent).not.toContain('Prompt sent to OpenRouter');\n",
)
text = text.replace(
    "    exportProfile: benchmark,\n"
    "    exportSessionFeedback: null,\n"
    "    exportActiveSessionStatus: undefined,\n",
    '',
)
text = text.replace("    onSelectExportProfile: vi.fn(),\n", '')
text = text.replace(
    "    onCopyBenchmark: vi.fn(),\n"
    "    onExportBenchmark: vi.fn(),\n"
    "    onCopyBenchmarkWithScriptPrompt: vi.fn(),\n"
    "    onCopyBenchmarkFeedbackPrompt: vi.fn(),\n"
    "    onCopyBenchmarkFeedback: vi.fn(),\n"
    "    onCopySessionFeedback: vi.fn(),\n"
    "    onCopyScriptPrompt: vi.fn(),\n"
    "    onCopyScriptTemplate: vi.fn(),\n"
    "    onCopyBenchmarkFeedbackPromptWithHumanFeedback: vi.fn(),\n",
    '',
)
path.write_text(text)
PY

rm -f \
  src/components/openrouter/OpenRouterCopyActionsSection.tsx \
  src/components/openrouter/OpenRouterBenchmarkExportGroup.tsx \
  src/components/openrouter/OpenRouterDiagnosticsExportGroup.tsx \
  src/components/openrouter/OpenRouterExportProfileControls.tsx \
  src/components/openrouter/OpenRouterNotesEditor.tsx \
  src/components/openrouter/OpenRouterPrimaryExportGroup.tsx \
  src/components/openrouter/OpenRouterTemplatesExportGroup.tsx \
  src/components/openrouter/openRouterWorkspaceExportPayloadBuilders.ts \
  src/components/openrouter/useOpenRouterWorkspaceClipboard.ts \
  src/styles/adaptive/export-panels.css

echo "Applied OpenRouter card 4 removal. Review with: git diff --stat && git diff"
