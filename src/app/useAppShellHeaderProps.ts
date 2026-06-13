import type { DictaAppProfile } from '../core/appProfiles';
import { useMemo } from 'react';
import type { AppShellHeaderProps } from '../components/app-shell/AppShellHeader';

type UseAppShellHeaderPropsArgs = {
  themeMode: AppShellHeaderProps['themeMode'];
  showOpenRouterStatus: boolean;
  effectiveOpenRouterDefaultModel: string;
  buildInfoTitle: string;
  buildInfoLabel: string;
  showAdminButton: boolean;
  showAdaptiveButton: boolean;
  showOpenRouterButton: boolean;
  syncStatusState: string;
  syncStatusText: string;
  appProfile: DictaAppProfile | null;
  onOpenLeaderboard: () => void;
  onOpenMobileTraining: () => void;
  onOpenAdaptive: () => void;
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
  showAdaptiveButton,
  showOpenRouterButton,
  syncStatusState,
  syncStatusText,
  appProfile,
  onOpenLeaderboard,
  onOpenMobileTraining,
  onOpenAdaptive,
  onOpenAdmin,
  onOpenOpenRouter,
  onToggleTheme,
  onSignOut,
}: UseAppShellHeaderPropsArgs): AppShellHeaderProps {
  return useMemo(() => {
    const openRouterModel = effectiveOpenRouterDefaultModel.trim();

    return {
      themeMode,
      showOpenRouterStatus,
      openRouterModelIsSet: Boolean(openRouterModel),
      openRouterModelTitle: openRouterModel ? `Selected OpenRouter model: ${openRouterModel}` : 'No OpenRouter model selected',
      openRouterModelLabel: openRouterModel ? `Model set: ${openRouterModel}` : 'No model set',
      buildInfoTitle,
      buildInfoLabel,
      showAdminButton,
      showAdaptiveButton,
      showOpenRouterButton,
      syncStatusState,
      syncStatusText,
      appProfile,
      onOpenLeaderboard,
      onOpenMobileTraining,
      onOpenAdaptive,
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
    showAdaptiveButton,
    showOpenRouterButton,
    syncStatusState,
    syncStatusText,
    appProfile,
    onOpenLeaderboard,
    onOpenMobileTraining,
    onOpenAdaptive,
    onOpenAdmin,
    onOpenOpenRouter,
    onToggleTheme,
    onSignOut,
  ]);
}
