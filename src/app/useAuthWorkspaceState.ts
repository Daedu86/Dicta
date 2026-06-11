import { useEffect, useState } from 'react';
import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import type { AuthView } from './sessionTypes';

type UseAuthWorkspaceStateOptions = {
  authRequired: boolean;
  supabaseClient: SupabaseClient | null;
};

export function useAuthWorkspaceState({ authRequired, supabaseClient }: UseAuthWorkspaceStateOptions) {
  const [authSession, setAuthSession] = useState<SupabaseAuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(authRequired));
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authView, setAuthView] = useState<AuthView>(() => {
    const authParams = `${window.location.hash}${window.location.search}`;
    return authParams.includes('type=recovery') || authParams.includes('type%3Drecovery') ? 'updatePassword' : 'signIn';
  });
  const [authNewPassword, setAuthNewPassword] = useState('');
  const [authNewPasswordConfirm, setAuthNewPasswordConfirm] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authMessageTone, setAuthMessageTone] = useState<'hint' | 'success' | 'error'>('hint');
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!supabaseClient || !authRequired) {
      setAuthLoading(false);
      return;
    }
    let cancelled = false;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setAuthSession(data.session ?? null);
        setAuthLoading(false);
      }
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setAuthSession(session);
      setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('updatePassword');
        setAuthError('');
        setAuthMessage('Enter a new password to finish recovery.');
        setAuthMessageTone('hint');
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [authRequired, supabaseClient]);

  return {
    authSession,
    setAuthSession,
    authLoading,
    setAuthLoading,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
    authView,
    setAuthView,
    authNewPassword,
    setAuthNewPassword,
    authNewPasswordConfirm,
    setAuthNewPasswordConfirm,
    authMessage,
    setAuthMessage,
    authMessageTone,
    setAuthMessageTone,
    authBusy,
    setAuthBusy,
  };
}
