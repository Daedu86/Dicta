import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { DictaAppProfile, DictaAppRole } from '../../core/appProfiles';
import type { MetricsLanguageView } from '../../core/liveMetrics';
import type { SessionTelemetry } from '../../types/dictation';
import type { SupabaseSyncStatus } from '../../app/useSessionPersistenceSync';
import type { AdminStorageSummary } from '../../app/adminStorageSummary';
import { buildOpenRouterModelOptions } from '../openrouter/openRouterViewHelpers';
import type { OpenRouterModelSummary } from '../openrouter/types';
import { AdminHeader } from './AdminHeader';
import { AdminKpiGrid } from './AdminKpiGrid';
import { AdminUsersCard } from './AdminUsersCard';
import { AdminMemberAccessCard } from './AdminMemberAccessCard';
import { AdminCreateUserCard } from './AdminCreateUserCard';
import { AdminBrowserStorageCard } from './AdminBrowserStorageCard';
import { AdminProjectFilesCard } from './AdminProjectFilesCard';
import { AdminSessionInventoryCard } from './AdminSessionInventoryCard';

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

type AccessDraft = {
  canAccessOpenRouter: boolean;
  assignedOpenRouterModel: string;
  sessionLimit: string;
};

type ProfileSessionCounts = Record<string, number>;

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

export function AdminWorkspace<TSession extends AdminWorkspaceSession>({
  sessions,
  summary,
  fileInventory,
  fileInventoryError,
  exportMessage,
  syncStatus,
  languageView,
  onChangeLanguage,
  onBackToTraining,
  onCopyLocalStorage,
  onExportLocalStorage,
  onImportLocalStorage,
  onExportSession,
  onCopySession,
  appProfile,
  visibleProfiles,
  profileSessionCounts,
  selectedProfileFilter,
  onChangeProfileFilter,
  onUpdateProfileAccess,
  authHeaders,
  remoteAdminStatus,
  openRouterModels,
  openRouterModelStatus,
  openRouterModelError,
  onRefreshOpenRouterModels,
}: AdminWorkspaceProps<TSession>) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserProfileId, setNewUserProfileId] = useState('');
  const [newUserRole, setNewUserRole] = useState<DictaAppRole>('member');
  const [newUserMessage, setNewUserMessage] = useState('');
  const [newUserBusy, setNewUserBusy] = useState(false);
  const [accessDrafts, setAccessDrafts] = useState<Record<string, AccessDraft>>({});
  const [accessBusyProfileId, setAccessBusyProfileId] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const memberProfiles = visibleProfiles.filter((profile) => profile.role === 'member');
  const memberModelOptions = buildOpenRouterModelOptions(openRouterModels, memberProfiles.map((profile) => profile.assignedOpenRouterModel));

  useEffect(() => {
    setAccessDrafts((current) => {
      const next = { ...current };
      for (const profile of visibleProfiles) {
        if (profile.role !== 'member') continue;
        if (!next[profile.profileId]) {
          next[profile.profileId] = {
            canAccessOpenRouter: profile.canAccessOpenRouter,
            assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
            sessionLimit: String(profile.sessionLimit ?? 15),
          };
        }
      }
      return next;
    });
  }, [visibleProfiles]);

  async function onImportFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    onImportLocalStorage(await file.text());
  }

  async function createDictaUser(): Promise<void> {
    setNewUserBusy(true);
    setNewUserMessage('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName,
          profileId: newUserProfileId,
          role: newUserRole,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `User creation failed (${response.status}).`);
      }
      const payload = (await response.json()) as { displayName?: string; profileId?: string };
      setNewUserMessage(`Created ${payload.displayName ?? newUserEmail} Â· profile ${payload.profileId ?? newUserProfileId}. Refresh Admin to see the profile list.`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserProfileId('');
      setNewUserRole('member');
    } catch (error) {
      setNewUserMessage(error instanceof Error ? error.message : 'User creation failed.');
    } finally {
      setNewUserBusy(false);
    }
  }

  async function saveProfileAccess(profile: DictaAppProfile): Promise<void> {
    const draft = accessDrafts[profile.profileId] ?? {
      canAccessOpenRouter: profile.canAccessOpenRouter,
      assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
      sessionLimit: String(profile.sessionLimit ?? 15),
    };
    const sessionLimitNumber = Number(draft.sessionLimit);
    if (!Number.isFinite(sessionLimitNumber) || sessionLimitNumber < 0) {
      setAccessMessage('Session limit must be zero or higher.');
      return;
    }
    setAccessBusyProfileId(profile.profileId);
    setAccessMessage('');
    try {
      const updated = await onUpdateProfileAccess(profile, {
        canAccessOpenRouter: draft.canAccessOpenRouter,
        assignedOpenRouterModel: draft.assignedOpenRouterModel.trim(),
        sessionLimit: Math.floor(sessionLimitNumber),
      });
      setAccessDrafts((current) => ({
        ...current,
        [updated.profileId]: {
          canAccessOpenRouter: updated.canAccessOpenRouter,
          assignedOpenRouterModel: updated.assignedOpenRouterModel ?? '',
          sessionLimit: String(updated.sessionLimit ?? 15),
        },
      }));
      setAccessMessage(`Updated ${updated.displayName}.`);
    } catch (error) {
      setAccessMessage(error instanceof Error ? error.message : 'Profile access update failed.');
    } finally {
      setAccessBusyProfileId('');
    }
  }

  function updateAccessDraft(profileId: string, draft: AccessDraft): void {
    setAccessDrafts((current) => ({
      ...current,
      [profileId]: draft,
    }));
  }

  function resetProfileSessionLimit(profile: DictaAppProfile): void {
    const nextLimit = profile.role === 'admin' ? null : 15;
    const draft = accessDrafts[profile.profileId] ?? {
      canAccessOpenRouter: profile.canAccessOpenRouter,
      assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
      sessionLimit: String(profile.sessionLimit ?? 15),
    };
    void onUpdateProfileAccess(profile, {
      canAccessOpenRouter: draft.canAccessOpenRouter,
      assignedOpenRouterModel: draft.assignedOpenRouterModel.trim(),
      sessionLimit: nextLimit,
    }).then((updated) => {
      setAccessDrafts((current) => ({
        ...current,
        [updated.profileId]: {
          canAccessOpenRouter: updated.canAccessOpenRouter,
          assignedOpenRouterModel: updated.assignedOpenRouterModel ?? '',
          sessionLimit: String(updated.sessionLimit ?? 15),
        },
      }));
      setAccessMessage(`Reset session limit for ${updated.displayName}.`);
    }).catch((error) => {
      setAccessMessage(error instanceof Error ? error.message : 'Session limit reset failed.');
    });
  }

  return (
    <section className="panel workspace-panel admin-workspace">
      <AdminHeader
        appProfile={appProfile}
        languageView={languageView}
        onChangeLanguage={onChangeLanguage}
        onBackToTraining={onBackToTraining}
      />

      {exportMessage ? <p className="success">{exportMessage}</p> : null}

      <AdminKpiGrid summary={summary} syncStatus={syncStatus} />

      <div className="admin-grid">
        <AdminUsersCard
          visibleProfiles={visibleProfiles}
          profileSessionCounts={profileSessionCounts}
          selectedProfileFilter={selectedProfileFilter}
          onChangeProfileFilter={onChangeProfileFilter}
          remoteAdminStatus={remoteAdminStatus}
        />

        <AdminMemberAccessCard
          memberProfiles={memberProfiles}
          profileSessionCounts={profileSessionCounts}
          accessDrafts={accessDrafts}
          accessBusyProfileId={accessBusyProfileId}
          accessMessage={accessMessage}
          memberModelOptions={memberModelOptions}
          openRouterModels={openRouterModels}
          openRouterModelStatus={openRouterModelStatus}
          openRouterModelError={openRouterModelError}
          onRefreshOpenRouterModels={onRefreshOpenRouterModels}
          onChangeAccessDraft={updateAccessDraft}
          onSaveProfileAccess={saveProfileAccess}
          onResetSessionLimit={resetProfileSessionLimit}
        />

        <AdminCreateUserCard
          newUserEmail={newUserEmail}
          newUserPassword={newUserPassword}
          newUserDisplayName={newUserDisplayName}
          newUserProfileId={newUserProfileId}
          newUserRole={newUserRole}
          newUserMessage={newUserMessage}
          newUserBusy={newUserBusy}
          onChangeNewUserEmail={setNewUserEmail}
          onChangeNewUserPassword={setNewUserPassword}
          onChangeNewUserDisplayName={setNewUserDisplayName}
          onChangeNewUserProfileId={setNewUserProfileId}
          onChangeNewUserRole={setNewUserRole}
          onCreateUser={() => void createDictaUser()}
        />

        <AdminBrowserStorageCard
          localStorageEntries={summary.localStorageEntries}
          syncStatus={syncStatus}
          importInputRef={importInputRef}
          onCopyLocalStorage={onCopyLocalStorage}
          onExportLocalStorage={onExportLocalStorage}
          onImportFileChange={onImportFileChange}
        />

        <AdminProjectFilesCard
          fileInventory={fileInventory}
          fileInventoryError={fileInventoryError}
        />
      </div>

      <AdminSessionInventoryCard
        sessions={sessions}
        languageView={languageView}
        onExportSession={onExportSession}
        onCopySession={onCopySession}
      />
    </section>
  );
}
