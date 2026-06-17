import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Session as SupabaseAuthSession } from '@supabase/supabase-js';
import type { DictaAppProfile } from '../core/appProfiles';
import type { StoredSession } from './sessionTypes';

type UseDictaAppProfileResetOptions = {
  authSession: SupabaseAuthSession | null;
  setAppProfile: Dispatch<SetStateAction<DictaAppProfile | null>>;
  setAppProfileError: Dispatch<SetStateAction<string>>;
  setVisibleProfiles: Dispatch<SetStateAction<DictaAppProfile[]>>;
  setAdminProfileFilter: Dispatch<SetStateAction<string>>;
  setAdminRemoteSessions: Dispatch<SetStateAction<StoredSession[]>>;
  setAdminProfileSessionCounts: Dispatch<SetStateAction<Record<string, number>>>;
  setAdminRemoteStatus: Dispatch<SetStateAction<string>>;
};

export function useDictaAppProfileReset({
  authSession,
  setAppProfile,
  setAppProfileError,
  setVisibleProfiles,
  setAdminProfileFilter,
  setAdminRemoteSessions,
  setAdminProfileSessionCounts,
  setAdminRemoteStatus,
}: UseDictaAppProfileResetOptions): void {
  useEffect(() => {
    if (authSession) return;
    setAppProfile(null);
    setAppProfileError('');
    setVisibleProfiles([]);
    setAdminProfileFilter('self');
    setAdminRemoteSessions([]);
    setAdminProfileSessionCounts({});
    setAdminRemoteStatus('');
  }, [
    authSession,
    setAdminProfileFilter,
    setAdminProfileSessionCounts,
    setAdminRemoteSessions,
    setAdminRemoteStatus,
    setAppProfile,
    setAppProfileError,
    setVisibleProfiles,
  ]);
}
