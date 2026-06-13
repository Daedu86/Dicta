import { useCallback } from 'react';
import type { FormEvent } from 'react';
import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import type { DictaAppProfile } from '../core/appProfiles';
import type { AuthView } from './sessionTypes';

type AuthMessageTone = 'hint' | 'success' | 'error';

type UseSupabaseAuthActionsOptions = {
  supabaseClient: SupabaseClient | null;
  authSession: SupabaseAuthSession | null;
  authEmail: string;
  authPassword: string;
  authNewPassword: string;
  authNewPasswordConfirm: string;
  setAuthSession: (session: SupabaseAuthSession | null) => void;
  setAppProfile: (profile: DictaAppProfile | null) => void;
  setAuthEmail: (email: string) => void;
  setAuthPassword: (password: string) => void;
  setAuthNewPassword: (password: string) => void;
  setAuthNewPasswordConfirm: (password: string) => void;
  setAuthView: (view: AuthView) => void;
  setAuthError: (message: string) => void;
  setAuthMessage: (message: string) => void;
  setAuthMessageTone: (tone: AuthMessageTone) => void;
  setAuthBusy: (busy: boolean) => void;
};

export function useSupabaseAuthActions({
  supabaseClient,
  authSession,
  authEmail,
  authPassword,
  authNewPassword,
  authNewPasswordConfirm,
  setAuthSession,
  setAppProfile,
  setAuthEmail,
  setAuthPassword,
  setAuthNewPassword,
  setAuthNewPasswordConfirm,
  setAuthView,
  setAuthError,
  setAuthMessage,
  setAuthMessageTone,
  setAuthBusy,
}: UseSupabaseAuthActionsOptions) {
  const signInWithSupabase = useCallback(async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    if (!supabaseClient) return;
    setAuthError('');
    setAuthMessage('');
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthPassword('');
  }, [authEmail, authPassword, setAuthError, setAuthMessage, setAuthPassword, supabaseClient]);

  const showAuthView = useCallback((view: AuthView): void => {
    setAuthView(view);
    setAuthError('');
    setAuthMessage('');
    if (view !== 'updatePassword') {
      setAuthNewPassword('');
      setAuthNewPasswordConfirm('');
    }
  }, [setAuthError, setAuthMessage, setAuthNewPassword, setAuthNewPasswordConfirm, setAuthView]);

  const requestSupabasePasswordReset = useCallback(async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    if (!supabaseClient) return;
    const email = authEmail.trim();
    if (!email) {
      setAuthError('Enter the account email first.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/training`,
      });
      if (error) throw error;
      setAuthMessage(`Password reset email sent to ${email}. Open the newest email on this device.`);
      setAuthMessageTone('success');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to send password reset email.');
    } finally {
      setAuthBusy(false);
    }
  }, [authEmail, setAuthBusy, setAuthError, setAuthMessage, setAuthMessageTone, supabaseClient]);

  const updateSupabasePassword = useCallback(async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    if (!supabaseClient) return;
    if (!authSession) {
      setAuthError('Open the latest password reset email again, then set a new password.');
      return;
    }
    if (authNewPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (authNewPassword !== authNewPasswordConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    const email = authSession.user.email ?? authEmail;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: authNewPassword });
      if (error) throw error;
      await supabaseClient.auth.signOut();
      setAuthSession(null);
      setAppProfile(null);
      setAuthEmail(email);
      setAuthPassword('');
      setAuthNewPassword('');
      setAuthNewPasswordConfirm('');
      setAuthView('signIn');
      setAuthMessage('Password updated. Sign in with the new password.');
      setAuthMessageTone('success');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setAuthBusy(false);
    }
  }, [
    authEmail,
    authNewPassword,
    authNewPasswordConfirm,
    authSession,
    setAppProfile,
    setAuthBusy,
    setAuthEmail,
    setAuthError,
    setAuthMessage,
    setAuthMessageTone,
    setAuthNewPassword,
    setAuthNewPasswordConfirm,
    setAuthPassword,
    setAuthSession,
    setAuthView,
    supabaseClient,
  ]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabaseClient?.auth.signOut();
    } finally {
      setAuthSession(null);
      setAppProfile(null);
      setAuthView('signIn');
      setAuthPassword('');
      setAuthNewPassword('');
      setAuthNewPasswordConfirm('');
    }
  }, [
    setAppProfile,
    setAuthNewPassword,
    setAuthNewPasswordConfirm,
    setAuthPassword,
    setAuthSession,
    setAuthView,
    supabaseClient,
  ]);

  return {
    signInWithSupabase,
    showAuthView,
    requestSupabasePasswordReset,
    updateSupabasePassword,
    signOut,
  };
}
