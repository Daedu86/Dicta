import { useState } from 'react';
import type { Session as SupabaseAuthSession } from '@supabase/supabase-js';
import type { AuthView } from './sessionTypes';

export function useAuthWorkspaceState({ authRequired }: { authRequired: boolean }) {
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
