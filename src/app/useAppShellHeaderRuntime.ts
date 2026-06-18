import type { Dispatch, SetStateAction } from 'react';
import { useAppShellHeaderProps } from './useAppShellHeaderProps';
import { useAppShellSyncStatusText } from './useAppShellSyncStatusText';
import { formatSessionDate } from './sessionDateFormatters';
import {
  formatSupabaseSyncState,
  type PendingSyncSummary,
} from './supabaseSyncPresentation';
import {
  buildBuildInfoLabel,
  buildBuildInfoTitle,
  type DictaBuildInfo,
} from '../core/buildInfo';
import type { SupabaseSyncStatus } from './useSessionPersistenceSync';

declare const __DICTA_BUILD_INFO__: DictaBuildInfo;

const DICTA_BUILD_INFO = __DICTA_BUILD_INFO__;
const DICTA_BUILD_INFO_LABEL = buildBuildInfoLabel(DICTA_BUILD_INFO);
const DICTA_BUILD_INFO_TITLE = buildBuildInfoTitle(DICTA_BUILD_INFO);

type AppShellHeaderPropsArgs = Parameters<typeof useAppShellHeaderProps>[0];
type ThemeMode = AppShellHeaderPropsArgs['themeMode'];

type UseAppShellHeaderRuntimeArgs = {
  themeMode: ThemeMode;
  isOnline: boolean;
  effectiveOpenRouterDefaultModel: AppShellHeaderPropsArgs['effectiveOpenRouterDefaultModel'];
  isCurrentProfileAdmin: boolean;
  authRequired: boolean;
  supabaseSyncStatus: SupabaseSyncStatus;
  pendingSyncSummary: PendingSyncSummary;
  appProfile: AppShellHeaderPropsArgs['appProfile'];
  sessionQuotaStatus: AppShellHeaderPropsArgs['sessionQuotaStatus'];
  navigateAppRoute: (path: '/training') => void;
  openAdaptiveWorkspaceFromHeader: AppShellHeaderPropsArgs['onOpenAdaptive'];
  showAdminWorkspace: AppShellHeaderPropsArgs['onOpenAdmin'];
  showOpenRouterWorkspace: AppShellHeaderPropsArgs['onOpenOpenRouter'];
  setThemeMode: Dispatch<SetStateAction<ThemeMode>>;
  signOut: AppShellHeaderPropsArgs['onSignOut'];
};

export function useAppShellHeaderRuntime({
  themeMode,
  isOnline,
  effectiveOpenRouterDefaultModel,
  isCurrentProfileAdmin,
  authRequired,
  supabaseSyncStatus,
  pendingSyncSummary,
  appProfile,
  sessionQuotaStatus,
  navigateAppRoute,
  openAdaptiveWorkspaceFromHeader,
  showAdminWorkspace,
  showOpenRouterWorkspace,
  setThemeMode,
  signOut,
}: UseAppShellHeaderRuntimeArgs) {
  const appShellSyncStatusText = useAppShellSyncStatusText({
    isOnline,
    supabaseSyncStatus,
    pendingSyncSummary,
    formatSupabaseSyncState,
    formatSessionDate,
  });

  const canAccessInternalWorkspace = isCurrentProfileAdmin || !authRequired;

  const appShellHeaderProps = useAppShellHeaderProps({
    themeMode,
    showOpenRouterStatus: !authRequired || Boolean(appProfile),
    effectiveOpenRouterDefaultModel,
    buildInfoTitle: DICTA_BUILD_INFO_TITLE,
    buildInfoLabel: DICTA_BUILD_INFO_LABEL,
    showAdminButton: canAccessInternalWorkspace,
    showAdaptiveButton: canAccessInternalWorkspace,
    showOpenRouterButton: canAccessInternalWorkspace,
    syncStatusState: supabaseSyncStatus.state,
    syncStatusText: appShellSyncStatusText,
    appProfile,
    sessionQuotaStatus,
    onOpenMobileTraining: () => navigateAppRoute('/training'),
    onOpenAdaptive: openAdaptiveWorkspaceFromHeader,
    onOpenAdmin: showAdminWorkspace,
    onOpenOpenRouter: showOpenRouterWorkspace,
    onToggleTheme: () => setThemeMode((value) => (value === 'dark' ? 'light' : 'dark')),
    onSignOut: signOut,
  });

  return {
    appShellHeaderProps,
  };
}
