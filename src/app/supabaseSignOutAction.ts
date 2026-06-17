import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseAuthActionSetters } from './supabaseAuthActionTypes';

type SignOutSupabaseOptions = Pick<
  SupabaseAuthActionSetters,
  | 'setAuthSession'
  | 'setAppProfile'
  | 'setAuthView'
  | 'setAuthPassword'
  | 'setAuthNewPassword'
  | 'setAuthNewPasswordConfirm'
> & {
  supabaseClient: SupabaseClient | null;
};

export async function signOutFromSupabase({
  supabaseClient,
  setAuthSession,
  setAppProfile,
  setAuthView,
  setAuthPassword,
  setAuthNewPassword,
  setAuthNewPasswordConfirm,
}: SignOutSupabaseOptions): Promise<void> {
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
}
