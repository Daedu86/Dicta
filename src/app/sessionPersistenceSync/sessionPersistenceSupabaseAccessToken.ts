import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export function useSupabaseAccessTokenRef(
  supabaseClient: SupabaseClient | null,
  syncEnabled: boolean,
  supabaseSyncIdentity: string,
): MutableRefObject<string> {
  const supabaseAccessTokenRef = useRef<string>('');

  useEffect(() => {
    supabaseAccessTokenRef.current = '';
    if (!supabaseClient || !syncEnabled) return;

    const auth = supabaseClient.auth;
    if (!auth?.getSession || !auth?.onAuthStateChange) return;
    let cancelled = false;
    void auth.getSession().then(({ data }) => {
      if (!cancelled) {
        supabaseAccessTokenRef.current = data.session?.access_token ?? '';
      }
    });

    const { data } = auth.onAuthStateChange((_event, session) => {
      supabaseAccessTokenRef.current = session?.access_token ?? '';
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supabaseClient, supabaseSyncIdentity, syncEnabled]);

  return supabaseAccessTokenRef;
}
