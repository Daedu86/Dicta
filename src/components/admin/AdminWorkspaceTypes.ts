import type { DictaAppProfile } from '../../core/appProfiles';
import type { MetricsLanguageView } from '../../core/liveMetrics';
import type { SessionTelemetry } from '../../types/dictation';
import type { SupabaseSyncStatus } from '../../app/useSessionPersistenceSync';
import type { AdminStorageSummary } from '../../app/adminStorageSummary';
import type { OpenRouterModelSummary } from '../openrouter/types';

export type AdminWorkspaceSession = {
  id: string;
  name: string;
  inputMode: string;
  updatedAt: string;
  ttsPracticeText: string;
  status: 'ready' | 'running' | 'paused' | 'finished' | 'error';
  telemetry: SessionTelemetry;
  [key: string]: unknown;
};

export type AdminFileInventory = {
  projectRoot: string;
  folders: Array<{
    label: string;
    relativePath: string;
    absolutePath: string;
    exists: boolean;
    fileCount: number;
    totalBytes: number;
    wavCount: number;
    jsonCount: number;
    transcriptCount: number;
  }>;
};

export type AdminAccessDraft = {
  canAccessOpenRouter: boolean;
  assignedOpenRouterModel: string;
  sessionLimit: string;
};

export type ProfileSessionCounts = Record<string, number>;

export type ProfileAccessPatch = {
  canAccessOpenRouter: boolean;
  assignedOpenRouterModel: string;
  sessionLimit: number | null;
};

export type AdminWorkspaceProps<TSession extends AdminWorkspaceSession> = {
  sessions: TSession[];
  summary: AdminStorageSummary;
  fileInventory: AdminFileInventory | null;
  fileInventoryError: string;
  exportMessage: string;
  syncStatus: SupabaseSyncStatus;
  languageView: MetricsLanguageView;
  onChangeLanguage: (value: MetricsLanguageView) => void;
  onBackToTraining: () => void;
  onOpenOverview: () => void;
  onOpenOpenRouter: () => void;
  onCopyLocalStorage: () => void;
  onExportLocalStorage: () => void;
  onImportLocalStorage: (rawJson: string) => void;
  onExportSession: (session: TSession) => void;
  onCopySession: (session: TSession) => void;
  appProfile: DictaAppProfile | null;
  visibleProfiles: DictaAppProfile[];
  profileSessionCounts: ProfileSessionCounts;
  selectedProfileFilter: string;
  onChangeProfileFilter: (value: string) => void;
  onUpdateProfileAccess: (
    profile: DictaAppProfile,
    patch: ProfileAccessPatch,
  ) => Promise<DictaAppProfile>;
  authHeaders: Record<string, string>;
  remoteAdminStatus: string;
  openRouterModels: OpenRouterModelSummary[];
  openRouterModelStatus: 'idle' | 'loading' | 'ready' | 'error';
  openRouterModelError: string;
  onRefreshOpenRouterModels: () => Promise<void>;
};
