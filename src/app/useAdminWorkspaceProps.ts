import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { AdminWorkspaceProps } from '../components/admin/AdminWorkspace';
import { copyDictaLocalStorage, downloadDictaLocalStorage } from './dictaLocalStorageSnapshot';
import { copySessionSnapshot, downloadSessionSnapshot } from './sessionSnapshotActions';
import type { StoredSession } from './sessionTypes';

type UseAdminWorkspacePropsArgs = Omit<
  AdminWorkspaceProps<StoredSession>,
  'authHeaders' | 'onCopyLocalStorage' | 'onExportLocalStorage' | 'onExportSession' | 'onCopySession'
> & {
  getAuthHeaders: () => Record<string, string>;
  setExportMessage: Dispatch<SetStateAction<string>>;
};

export function useAdminWorkspaceProps({
  sessions,
  summary,
  fileInventory,
  fileInventoryError,
  exportMessage,
  syncStatus,
  languageView,
  onChangeLanguage,
  onBackToTraining,
  onOpenOverview,
  onOpenOpenRouter,
  onImportLocalStorage,
  appProfile,
  visibleProfiles,
  profileSessionCounts,
  selectedProfileFilter,
  onChangeProfileFilter,
  onUpdateProfileAccess,
  getAuthHeaders,
  remoteAdminStatus,
  openRouterModels,
  openRouterModelStatus,
  openRouterModelError,
  onRefreshOpenRouterModels,
  setExportMessage,
}: UseAdminWorkspacePropsArgs): AdminWorkspaceProps<StoredSession> {
  return useMemo(() => ({
    sessions,
    summary,
    fileInventory,
    fileInventoryError,
    exportMessage,
    syncStatus,
    languageView,
    onChangeLanguage,
    onBackToTraining,
    onOpenOverview,
    onOpenOpenRouter,
    onCopyLocalStorage: () => void copyDictaLocalStorage(setExportMessage),
    onExportLocalStorage: downloadDictaLocalStorage,
    onImportLocalStorage,
    onExportSession: downloadSessionSnapshot,
    onCopySession: (session) => void copySessionSnapshot(session, setExportMessage),
    appProfile,
    visibleProfiles,
    profileSessionCounts,
    selectedProfileFilter,
    onChangeProfileFilter,
    onUpdateProfileAccess,
    authHeaders: getAuthHeaders(),
    remoteAdminStatus,
    openRouterModels,
    openRouterModelStatus,
    openRouterModelError,
    onRefreshOpenRouterModels,
  }), [
    sessions,
    summary,
    fileInventory,
    fileInventoryError,
    exportMessage,
    syncStatus,
    languageView,
    onChangeLanguage,
    onBackToTraining,
    onOpenOverview,
    onOpenOpenRouter,
    onImportLocalStorage,
    appProfile,
    visibleProfiles,
    profileSessionCounts,
    selectedProfileFilter,
    onChangeProfileFilter,
    onUpdateProfileAccess,
    getAuthHeaders,
    remoteAdminStatus,
    openRouterModels,
    openRouterModelStatus,
    openRouterModelError,
    onRefreshOpenRouterModels,
    setExportMessage,
  ]);
}
