import { useAuthWorkspaceProps } from './useAuthWorkspaceProps';

type AuthWorkspacePropsArgs = Parameters<typeof useAuthWorkspaceProps>[0];

type UseAuthWorkspaceRuntimeArgs = {
  themeMode: AuthWorkspacePropsArgs['themeMode'];
  authLoading: AuthWorkspacePropsArgs['authLoading'];
  authView: AuthWorkspacePropsArgs['authView'];
  authSession: AuthWorkspacePropsArgs['authSession'];
  appProfile: AuthWorkspacePropsArgs['appProfile'];
  appProfileError: AuthWorkspacePropsArgs['appProfileError'];
  localStorageReadyForEffectiveProfile: AuthWorkspacePropsArgs['localStorageReadyForEffectiveProfile'];
  supabaseInitialSyncPending: AuthWorkspacePropsArgs['supabaseInitialSyncPending'];
  effectiveProfileId: AuthWorkspacePropsArgs['effectiveProfileId'];
  authEmail: AuthWorkspacePropsArgs['authEmail'];
  authPassword: AuthWorkspacePropsArgs['authPassword'];
  authNewPassword: AuthWorkspacePropsArgs['authNewPassword'];
  authNewPasswordConfirm: AuthWorkspacePropsArgs['authNewPasswordConfirm'];
  authBusy: AuthWorkspacePropsArgs['authBusy'];
  authMessage: AuthWorkspacePropsArgs['authMessage'];
  authMessageTone: AuthWorkspacePropsArgs['authMessageTone'];
  authError: AuthWorkspacePropsArgs['authError'];
  perfDiagnosticsEnabled: AuthWorkspacePropsArgs['perfDiagnosticsEnabled'];
  signInWithSupabase: AuthWorkspacePropsArgs['onSignIn'];
  requestSupabasePasswordReset: AuthWorkspacePropsArgs['onRequestPasswordReset'];
  updateSupabasePassword: AuthWorkspacePropsArgs['onUpdatePassword'];
  signOut: AuthWorkspacePropsArgs['onSignOut'];
  showAuthView: AuthWorkspacePropsArgs['onShowAuthView'];
  setAuthEmail: AuthWorkspacePropsArgs['onAuthEmailChange'];
  setAuthPassword: AuthWorkspacePropsArgs['onAuthPasswordChange'];
  setAuthNewPassword: AuthWorkspacePropsArgs['onAuthNewPasswordChange'];
  setAuthNewPasswordConfirm: AuthWorkspacePropsArgs['onAuthNewPasswordConfirmChange'];
};

export function useAuthWorkspaceRuntime({
  themeMode,
  authLoading,
  authView,
  authSession,
  appProfile,
  appProfileError,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  effectiveProfileId,
  authEmail,
  authPassword,
  authNewPassword,
  authNewPasswordConfirm,
  authBusy,
  authMessage,
  authMessageTone,
  authError,
  perfDiagnosticsEnabled,
  signInWithSupabase,
  requestSupabasePasswordReset,
  updateSupabasePassword,
  signOut,
  showAuthView,
  setAuthEmail,
  setAuthPassword,
  setAuthNewPassword,
  setAuthNewPasswordConfirm,
}: UseAuthWorkspaceRuntimeArgs) {
  const authWorkspaceProps = useAuthWorkspaceProps({
    themeMode,
    authLoading,
    authView,
    authSession,
    appProfile,
    appProfileError,
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    effectiveProfileId,
    authEmail,
    authPassword,
    authNewPassword,
    authNewPasswordConfirm,
    authBusy,
    authMessage,
    authMessageTone,
    authError,
    perfDiagnosticsEnabled,
    onSignIn: signInWithSupabase,
    onRequestPasswordReset: requestSupabasePasswordReset,
    onUpdatePassword: updateSupabasePassword,
    onSignOut: signOut,
    onShowAuthView: showAuthView,
    onAuthEmailChange: setAuthEmail,
    onAuthPasswordChange: setAuthPassword,
    onAuthNewPasswordChange: setAuthNewPassword,
    onAuthNewPasswordConfirmChange: setAuthNewPasswordConfirm,
  });

  return {
    authWorkspaceProps,
  };
}
