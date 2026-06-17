import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import { loadDictaAppProfile, type DictaAppProfile } from '../core/appProfiles';

type UseDictaAppProfileLoaderOptions = {
  supabaseClient: SupabaseClient | null;
  authSession: SupabaseAuthSession | null;
  authRequired: boolean;
  setAppProfile: Dispatch<SetStateAction<DictaAppProfile | null>>;
  setAppProfileError: Dispatch<SetStateAction<string>>;
};

export function useDictaAppProfileLoader({
  supabaseClient,
  authSession,
  authRequired,
  setAppProfile,
  setAppProfileError,
}: UseDictaAppProfileLoaderOptions): void {
  useEffect(() => {
    if (!supabaseClient || !authRequired || !authSession?.user) return;
    let cancelled = false;

    setAppProfileError('');
    loadDictaAppProfile(supabaseClient, authSession.user)
      .then((profile) => {
        if (cancelled) return;
        setAppProfile(profile);
        if (!profile) {
          setAppProfileError('Your Dicta account exists, but no app profile is mapped yet. Create a dicta_app_profiles row for this user.');
        } else if (!profile.active) {
          setAppProfileError('This Dicta profile is inactive.');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAppProfile(null);
          setAppProfileError(error instanceof Error ? error.message : 'Failed to load Dicta profile.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authSession?.user, authRequired, setAppProfile, setAppProfileError, supabaseClient]);
}
