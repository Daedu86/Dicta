import type { ComponentProps } from 'react';
import { PerfDiagnosticsOverlay } from '../components/PerfDiagnosticsOverlay';
import { TrainingView, type TrainingViewProps } from '../components/TrainingView';
import { AppShellHeader } from '../components/app-shell/AppShellHeader';
import { AuthWorkspace } from '../components/auth/AuthWorkspace';
import { TrainingHeader } from '../components/training/TrainingHeader';
import { SessionCreateCard } from '../components/runtime-workspaces/SessionCreateCard';
import { LiveMetricsDock } from '../components/runtime-workspaces/LiveMetricsDock';
import { VercelSpeedInsightsRouteSync } from '../observability/VercelSpeedInsights';
import { AppWorkspaceContent } from './AppWorkspaceContent';
import type { StoredSession } from './sessionTypes';

type AppWorkspaceContentProps = ComponentProps<typeof AppWorkspaceContent>;

type AppRouteRendererProps = {
  syncAuthRequired: boolean;
  authLoading: boolean;
  authView: string;
  authSession: unknown | null;
  appProfile: unknown | null;
  appProfileError: unknown;
  localStorageReadyForEffectiveProfile: boolean;
  supabaseInitialSyncPending: boolean;
  authWorkspaceProps: ComponentProps<typeof AuthWorkspace>;
  isFocusedTrainingRoute: boolean;
  themeMode: string;
  dictaLanguageView: ComponentProps<typeof TrainingHeader>['selectedLanguage'];
  setDictaLanguageView: ComponentProps<typeof TrainingHeader>['onChangeLanguage'];
  onBackToApp: ComponentProps<typeof TrainingHeader>['onBackToApp'];
  focusedTrainingProps: TrainingViewProps<StoredSession>;
  perfDiagnosticsEnabled: boolean;
  appShellHeaderProps: Omit<ComponentProps<typeof AppShellHeader>, 'children'>;
  sessionCreationMode: unknown;
  sessionCreateCardProps: ComponentProps<typeof SessionCreateCard>;
  pendingSessions: AppWorkspaceContentProps['pendingSessions'];
  activeSessionId: AppWorkspaceContentProps['activeSessionId'];
  openWorkspaceForSession: AppWorkspaceContentProps['onOpenPendingSession'];
  deleteSession: AppWorkspaceContentProps['onDeleteSession'];
  workspaceMode: AppWorkspaceContentProps['workspaceMode'];
  dashboardSession: AppWorkspaceContentProps['dashboardSession'];
  sessions: AppWorkspaceContentProps['sessions'];
  formatSessionStatus: AppWorkspaceContentProps['formatSessionStatus'];
  formatSessionDate: AppWorkspaceContentProps['formatSessionDate'];
  formatSessionPlaybackDuration: AppWorkspaceContentProps['formatSessionPlaybackDuration'];
  adaptiveBenchmarkSectionProps: AppWorkspaceContentProps['adaptiveBenchmarkSectionProps'];
  openRouterAccessState: AppWorkspaceContentProps['openRouterAccessState'];
  openRouterAccessMessage: AppWorkspaceContentProps['openRouterAccessMessage'];
  openRouterWorkspaceProps: AppWorkspaceContentProps['openRouterWorkspaceProps'];
  canAccessAdminWorkspace: AppWorkspaceContentProps['canAccessAdminWorkspace'];
  adminWorkspaceProps: AppWorkspaceContentProps['adminWorkspaceProps'];
  showLeaderboardWorkspace: AppWorkspaceContentProps['onBackToTraining'];
  liveMetricsDockProps: ComponentProps<typeof LiveMetricsDock>;
};


type AppSpeedInsightsRouteInput = {
  isAuthRoute: boolean;
  isFocusedTrainingRoute: boolean;
  sessionCreationMode: unknown;
  workspaceMode: AppWorkspaceContentProps['workspaceMode'];
};

function getAppSpeedInsightsRoute({
  isAuthRoute,
  isFocusedTrainingRoute,
  sessionCreationMode,
  workspaceMode,
}: AppSpeedInsightsRouteInput) {
  if (isAuthRoute) return '/auth';
  if (isFocusedTrainingRoute) return '/training';
  if (sessionCreationMode) return '/session/new';

  switch (workspaceMode) {
    case 'adaptive': return '/adaptive';
    case 'adaptive-flow': return '/adaptive/flow';
    case 'dashboard': return '/session/dashboard';
    case 'openrouter': return '/openrouter';
    case 'tts': return '/training/tts';
    case 'admin': return '/admin';
    case 'training':
    default:
      return '/';
  }
}

export function AppRouteRenderer({
  syncAuthRequired,
  authLoading,
  authView,
  authSession,
  appProfile,
  appProfileError,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  authWorkspaceProps,
  isFocusedTrainingRoute,
  themeMode,
  dictaLanguageView,
  setDictaLanguageView,
  onBackToApp,
  focusedTrainingProps,
  perfDiagnosticsEnabled,
  appShellHeaderProps,
  sessionCreationMode,
  sessionCreateCardProps,
  pendingSessions,
  activeSessionId,
  openWorkspaceForSession,
  deleteSession,
  workspaceMode,
  dashboardSession,
  sessions,
  formatSessionStatus,
  formatSessionDate,
  formatSessionPlaybackDuration,
  adaptiveBenchmarkSectionProps,
  openRouterAccessState,
  openRouterAccessMessage,
  openRouterWorkspaceProps,
  canAccessAdminWorkspace,
  adminWorkspaceProps,
  showLeaderboardWorkspace,
  liveMetricsDockProps,
}: AppRouteRendererProps) {
  const isAuthRoute =
    syncAuthRequired &&
    (
      authLoading ||
      authView === 'updatePassword' ||
      !authSession ||
      !appProfile ||
      appProfileError ||
      !localStorageReadyForEffectiveProfile ||
      supabaseInitialSyncPending
    );
  const speedInsightsRoute = getAppSpeedInsightsRoute({
    isAuthRoute: Boolean(isAuthRoute),
    isFocusedTrainingRoute,
    sessionCreationMode,
    workspaceMode,
  });

  if (isAuthRoute) {
    return (
      <>
        <VercelSpeedInsightsRouteSync route={speedInsightsRoute} />
        <AuthWorkspace {...authWorkspaceProps} />
      </>
    );
  }

  if (isFocusedTrainingRoute) {
    const trainingRouteGenerationClass = focusedTrainingProps.generationButtons.length > 0
      ? ' training-route-app-with-generation'
      : '';

    return (
      <>
        <VercelSpeedInsightsRouteSync route={speedInsightsRoute} />
        <main className={`app training-route-app${trainingRouteGenerationClass} ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
          <TrainingHeader
            selectedLanguage={dictaLanguageView}
            onChangeLanguage={setDictaLanguageView}
            onBackToApp={onBackToApp}
            generationButtons={focusedTrainingProps.generationButtons}
          />
          <TrainingView {...focusedTrainingProps} />
          <PerfDiagnosticsOverlay enabled={perfDiagnosticsEnabled} />
        </main>
      </>
    );
  }

  return (
    <>
      <VercelSpeedInsightsRouteSync route={speedInsightsRoute} />
      <main className={`app ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
        <section className="layout">
          <AppShellHeader {...appShellHeaderProps}>
            {sessionCreationMode ? (
              <SessionCreateCard {...sessionCreateCardProps} />
            ) : null}
          </AppShellHeader>
          <AppWorkspaceContent
            pendingSessions={pendingSessions}
            activeSessionId={activeSessionId}
            onOpenPendingSession={openWorkspaceForSession}
            onDeleteSession={deleteSession}
            workspaceMode={workspaceMode}
            dashboardSession={dashboardSession}
            sessions={sessions}
            formatSessionStatus={formatSessionStatus}
            formatSessionDate={formatSessionDate}
            formatSessionPlaybackDuration={formatSessionPlaybackDuration}
            onBackToTraining={showLeaderboardWorkspace}
            adaptiveBenchmarkSectionProps={adaptiveBenchmarkSectionProps}
            openRouterAccessState={openRouterAccessState}
            openRouterAccessMessage={openRouterAccessMessage}
            openRouterWorkspaceProps={openRouterWorkspaceProps}
            canAccessAdminWorkspace={canAccessAdminWorkspace}
            adaptiveReportButtonProps={liveMetricsDockProps}
            adminWorkspaceProps={adminWorkspaceProps}
          />
        </section>
        {workspaceMode === 'training' || workspaceMode === 'tts' ? (
          <LiveMetricsDock {...liveMetricsDockProps} />
        ) : null}
      </main>
    </>
  );
}
