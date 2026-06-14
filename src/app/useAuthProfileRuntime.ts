import { useAuthHeaders } from './useAuthHeaders';
import { useAuthWorkspaceState } from './useAuthWorkspaceState';
import {
  useDictaAppProfileRuntime,
} from './useDictaAppProfileRuntime';
import { useSupabaseAuthActions } from './useSupabaseAuthActions';

type UseAuthProfileRuntimeOptions = {
  syncConfig: Parameters<typeof useDictaAppProfileRuntime>[0]['syncConfig'];
  supabaseClient: Parameters<typeof useAuthWorkspaceState>[0]['supabaseClient'];
};

export function useAuthProfileRuntime({
  syncConfig,
  supabaseClient,
}: UseAuthProfileRuntimeOptions) {
  const authState = useAuthWorkspaceState({
    authRequired: syncConfig.authRequired,
    supabaseClient,
  });

  const profileRuntime = useDictaAppProfileRuntime({
    syncConfig,
    supabaseClient,
    authSession: authState.authSession,
    authLoading: authState.authLoading,
  });

  const authActions = useSupabaseAuthActions({
    supabaseClient,
    authSession: authState.authSession,
    authEmail: authState.authEmail,
    authPassword: authState.authPassword,
    authNewPassword: authState.authNewPassword,
    authNewPasswordConfirm: authState.authNewPasswordConfirm,
    setAuthSession: authState.setAuthSession,
    setAppProfile: profileRuntime.setAppProfile,
    setAuthEmail: authState.setAuthEmail,
    setAuthPassword: authState.setAuthPassword,
    setAuthNewPassword: authState.setAuthNewPassword,
    setAuthNewPasswordConfirm: authState.setAuthNewPasswordConfirm,
    setAuthView: authState.setAuthView,
    setAuthError: authState.setAuthError,
    setAuthMessage: authState.setAuthMessage,
    setAuthMessageTone: authState.setAuthMessageTone,
    setAuthBusy: authState.setAuthBusy,
  });

  const authHeaders = useAuthHeaders({
    authSession: authState.authSession,
  });

  return {
    ...authState,
    ...profileRuntime,
    ...authActions,
    ...authHeaders,
  };
}
