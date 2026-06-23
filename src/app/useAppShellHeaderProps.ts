import type { DictaAppProfile } from '../core/appProfiles';
import type { DictaSessionQuotaStatus } from '../core/appProfiles';
import { useMemo } from 'react';
import type { AppShellHeaderProps } from '../components/app-shell/AppShellHeader';

type UseAppShellHeaderPropsArgs = {
  themeMode: AppShellHeaderProps['themeMode'];
  showOpenRouterStatus: boolean;
  effectiveOpenRouterDefaultModel: string;
  buildInfoTitle: string;
  buildInfoLabel: string;
  showAdminButton: boolean;
  showAdaptiveFlowButton: boolean;
  showOpenRouterButton: boolean;
  syncStatusState: string;
  syncStatusText: string;
  appProfile: DictaAppProfile | null;
  sessionQuotaStatus: DictaSessionQuotaStatus;
  onOpenMobileTraining: () => void;
  onOpenAdaptiveFlow: () => void;
  onOpenAdmin: () => void;
  onOpenOpenRouter: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void | Promise<void>;
};

export function useAppShellHeaderProps({
  themeMode,
  showOpenRouterStatus,
  effectiveOpenRouterDefaultModel,
  buildInfoTitle,
  buildInfoLabel,
  showAdminButton,
  showAdaptiveFlowButton,
  showOpenRouterButton,
  syncStatusState,
  syncStatusText,
  appProfile,
  sessionQuotaStatus,
  onOpenMobileTraining,
  onOpenAdaptiveFlow,
  onOpenAdmin,
  onOpenOpenRouter,
  onToggleTheme,
  onSignOut,
}: UseAppShellHeaderPropsArgs): AppShellHeaderProps {
  return useMemo(() => {
    const assignedOpenRouterModel = appProfile?.role === 'member'
      ? appProfile.assignedOpenRouterModel?.trim() ?? ''
      : '';
    const openRouterModel = assignedOpenRouterModel || (appProfile?.role === 'member' ? '' : effectiveOpenRouterDefaultModel.trim());

    return {
      themeMode,
      showOpenRouterStatus,
      openRouterModelIsSet: Boolean(openRouterModel),
      openRouterModelTitle: openRouterModel ? `LLM assigned: ${openRouterModel}` : 'LLM not assigned',
      buildInfoTitle,
      buildInfoLabel,
      showAdminButton,
      showAdaptiveFlowButton,
      showOpenRouterButton,
      syncStatusState,
      syncStatusText,
      appProfile,
      sessionQuotaLimit: sessionQuotaStatus.limit,
      sessionQuotaUsed: sessionQuotaStatus.used,
      sessionQuotaBlocked: sessionQuotaStatus.blocked,
      onOpenMobileTraining,
      onOpenAdaptiveFlow,
      onOpenAdmin,
      onOpenOpenRouter,
      onToggleTheme,
      onSignOut,
    };
  }, [
    themeMode,
    showOpenRouterStatus,
    effectiveOpenRouterDefaultModel,
    buildInfoTitle,
    buildInfoLabel,
    showAdminButton,
    showAdaptiveFlowButton,
    showOpenRouterButton,
    syncStatusState,
    syncStatusText,
    appProfile,
    sessionQuotaStatus.limit,
    sessionQuotaStatus.used,
    sessionQuotaStatus.blocked,
    onOpenMobileTraining,
    onOpenAdaptiveFlow,
    onOpenAdmin,
    onOpenOpenRouter,
    onToggleTheme,
    onSignOut,
  ]);
}
