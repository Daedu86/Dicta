import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseAuthActionSetters } from './supabaseAuthActionTypes';

type UpdateSupabasePasswordOptions = SupabaseAuthActionSetters & {
  supabaseClient: SupabaseClient;
  authSession: SupabaseAuthSession | null;
  authEmail: string;
  authNewPassword: string;
  authNewPasswordConfirm: string;
};

export async function updateSupabaseAccountPassword({
  supabaseClient,
  authSession,
  authEmail,
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
}: UpdateSupabasePasswordOptions): Promise<void> {
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
}
