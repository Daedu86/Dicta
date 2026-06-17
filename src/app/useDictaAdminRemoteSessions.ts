import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DICTA_SYNC_TABLE } from '../core/supabaseSync';
import { asAdminRemoteStoredSession } from './sessionStorage';
import type { StoredSession } from './sessionTypes';

type UseDictaAdminRemoteSessionsOptions = {
  adminProfileFilter: string;
  supabaseClient: SupabaseClient | null;
  isCurrentProfileAdmin: boolean;
  setAdminRemoteSessions: Dispatch<SetStateAction<StoredSession[]>>;
  setAdminRemoteStatus: Dispatch<SetStateAction<string>>;
};

export function useDictaAdminRemoteSessions({
  adminProfileFilter,
  supabaseClient,
  isCurrentProfileAdmin,
  setAdminRemoteSessions,
  setAdminRemoteStatus,
}: UseDictaAdminRemoteSessionsOptions): void {
  useEffect(() => {
    if (adminProfileFilter === 'self') {
      setAdminRemoteSessions([]);
      setAdminRemoteStatus('');
      return;
    }
    if (!supabaseClient || !isCurrentProfileAdmin) return;
    let cancelled = false;

    setAdminRemoteStatus('Loading remote admin sessions...');
    let query = supabaseClient
      .from(DICTA_SYNC_TABLE)
      .select('profile_id,item_key,payload,updated_at')
      .eq('item_type', 'session')
      .order('updated_at', { ascending: false });
    if (adminProfileFilter !== 'all') {
      query = query.eq('profile_id', adminProfileFilter);
    }
    void (async () => {
      try {
        const { data, error } = await query;
        if (cancelled) return;
        if (error) throw error;
        const nextSessions = (data ?? [])
          .map((row: { payload: unknown }) => asAdminRemoteStoredSession(row.payload))
          .filter((session): session is StoredSession => Boolean(session));
        setAdminRemoteSessions(nextSessions);
        setAdminRemoteStatus(`Loaded ${nextSessions.length} remote session${nextSessions.length === 1 ? '' : 's'} for admin view.`);
      } catch (error) {
        if (!cancelled) {
          setAdminRemoteSessions([]);
          setAdminRemoteStatus(error instanceof Error ? error.message : 'Failed to load remote admin sessions.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminProfileFilter, isCurrentProfileAdmin, setAdminRemoteSessions, setAdminRemoteStatus, supabaseClient]);
}
