import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { AdminWorkspaceProps, AdminWorkspaceSession } from './AdminWorkspaceTypes';
import { AdminHeader } from './AdminHeader';
import { AdminKpiGrid } from './AdminKpiGrid';
import { AdminUsersCard } from './AdminUsersCard';
import { AdminMemberAccessCard } from './AdminMemberAccessCard';
import { AdminCreateUserCard } from './AdminCreateUserCard';
import { AdminBrowserStorageCard } from './AdminBrowserStorageCard';
import { AdminProjectFilesCard } from './AdminProjectFilesCard';
import { AdminSessionInventoryCard } from './AdminSessionInventoryCard';
import { useAdminCreateUser } from './useAdminCreateUser';
import { useAdminMemberAccess } from './useAdminMemberAccess';

export type {
  AdminAccessDraft,
  AdminFileInventory,
  AdminWorkspaceProps,
  AdminWorkspaceSession,
  ProfileAccessPatch,
  ProfileSessionCounts,
} from './AdminWorkspaceTypes';

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
  const createUser = useAdminCreateUser({ authHeaders });
  const memberAccess = useAdminMemberAccess({
    visibleProfiles,
    openRouterModels,
    onUpdateProfileAccess,
  });

  async function onImportFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    onImportLocalStorage(await file.text());
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
          memberProfiles={memberAccess.memberProfiles}
          profileSessionCounts={profileSessionCounts}
          accessDrafts={memberAccess.accessDrafts}
          accessBusyProfileId={memberAccess.accessBusyProfileId}
          accessMessage={memberAccess.accessMessage}
          memberModelOptions={memberAccess.memberModelOptions}
          openRouterModels={openRouterModels}
          openRouterModelStatus={openRouterModelStatus}
          openRouterModelError={openRouterModelError}
          onRefreshOpenRouterModels={onRefreshOpenRouterModels}
          onChangeAccessDraft={memberAccess.updateAccessDraft}
          onSaveProfileAccess={(profile) => void memberAccess.saveProfileAccess(profile)}
          onResetSessionLimit={memberAccess.resetProfileSessionLimit}
        />

        <AdminCreateUserCard
          newUserEmail={createUser.newUserEmail}
          newUserPassword={createUser.newUserPassword}
          newUserDisplayName={createUser.newUserDisplayName}
          newUserProfileId={createUser.newUserProfileId}
          newUserRole={createUser.newUserRole}
          newUserMessage={createUser.newUserMessage}
          newUserBusy={createUser.newUserBusy}
          onChangeNewUserEmail={createUser.setNewUserEmail}
          onChangeNewUserPassword={createUser.setNewUserPassword}
          onChangeNewUserDisplayName={createUser.setNewUserDisplayName}
          onChangeNewUserProfileId={createUser.setNewUserProfileId}
          onChangeNewUserRole={createUser.setNewUserRole}
          onCreateUser={() => void createUser.createDictaUser()}
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
