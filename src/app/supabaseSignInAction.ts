import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseAuthActionSetters } from './supabaseAuthActionTypes';

type RunSupabaseSignInOptions = Pick<
  SupabaseAuthActionSetters,
  'setAuthError' | 'setAuthMessage' | 'setAuthPassword'
> & {
  supabaseClient: SupabaseClient;
  authEmail: string;
  authPassword: string;
};

export async function runSupabaseSignIn({
  supabaseClient,
  authEmail,
  authPassword,
  setAuthError,
  setAuthMessage,
  setAuthPassword,
}: RunSupabaseSignInOptions): Promise<void> {
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
}
