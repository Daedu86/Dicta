import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPasswordRecoveryRedirectUrl } from './passwordRecoveryRedirect';
import type { SupabaseAuthActionSetters } from './supabaseAuthActionTypes';

type RequestSupabasePasswordResetOptions = Pick<
  SupabaseAuthActionSetters,
  'setAuthBusy' | 'setAuthError' | 'setAuthMessage' | 'setAuthMessageTone'
> & {
  supabaseClient: SupabaseClient;
  authEmail: string;
  configuredRedirectOrigin: string | undefined;
  currentOrigin: string;
};

export async function requestSupabasePasswordResetEmail({
  supabaseClient,
  authEmail,
  configuredRedirectOrigin,
  currentOrigin,
  setAuthBusy,
  setAuthError,
  setAuthMessage,
  setAuthMessageTone,
}: RequestSupabasePasswordResetOptions): Promise<void> {
  const email = authEmail.trim();
  if (!email) {
    setAuthError('Enter the account email first.');
    return;
  }

  setAuthBusy(true);
  setAuthError('');
  setAuthMessage('');
  try {
    const redirectTo = buildPasswordRecoveryRedirectUrl({
      configuredOrigin: configuredRedirectOrigin,
      currentOrigin,
    });
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
    setAuthMessage(`Password reset email sent to ${email}. Open the newest email on this device.`);
    setAuthMessageTone('success');
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : 'Failed to send password reset email.');
  } finally {
    setAuthBusy(false);
  }
}
