import { useCallback } from 'react';
import type { FormEvent } from 'react';
import { requestSupabasePasswordResetEmail } from './supabasePasswordResetAction';
import { updateSupabaseAccountPassword } from './supabasePasswordUpdateAction';
import { runSupabaseSignIn } from './supabaseSignInAction';
import { signOutFromSupabase } from './supabaseSignOutAction';
import { showSupabaseAuthView } from './supabaseAuthViewActions';
import type { AuthView } from './sessionTypes';
import type { UseSupabaseAuthActionsOptions } from './supabaseAuthActionTypes';

export function useSupabaseAuthActionsRuntime(options: UseSupabaseAuthActionsOptions) {
  const { supabaseClient } = options;

  const signInWithSupabase = useCallback(async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    if (!supabaseClient) return;
    await runSupabaseSignIn({ ...options, supabaseClient });
  }, [options, supabaseClient]);

  const showAuthView = useCallback((view: AuthView): void => {
    showSupabaseAuthView({ ...options, view });
  }, [options]);

  const requestSupabasePasswordReset = useCallback(async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    if (!supabaseClient) return;
    await requestSupabasePasswordResetEmail({
      ...options,
      supabaseClient,
      configuredRedirectOrigin: import.meta.env.VITE_DICTA_AUTH_REDIRECT_ORIGIN,
      currentOrigin: window.location.origin,
    });
  }, [options, supabaseClient]);

  const updateSupabasePassword = useCallback(async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    if (!supabaseClient) return;
    await updateSupabaseAccountPassword({ ...options, supabaseClient });
  }, [options, supabaseClient]);

  const signOut = useCallback(async (): Promise<void> => {
    await signOutFromSupabase(options);
  }, [options]);

  return {
    signInWithSupabase,
    showAuthView,
    requestSupabasePasswordReset,
    updateSupabasePassword,
    signOut,
  };
}
