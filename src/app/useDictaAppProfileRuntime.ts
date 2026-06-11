import { useEffect, useState } from 'react';
import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import { DICTA_SYNC_TABLE, type DictaSyncConfig } from '../core/supabaseSync';
import {
  isDictaAdmin,
  loadDictaAppProfile,
  loadVisibleDictaAppProfiles,
  resolveEffectiveSyncProfileId,
  resolveOpenRouterAccessState,
  type DictaAppProfile,
} from '../core/appProfiles';
import { asAdminRemoteStoredSession } from './sessionStorage';
import type { StoredSession } from './sessionTypes';

type UseDictaAppProfileRuntimeOptions = {
  syncConfig: DictaSyncConfig;
  supabaseClient: SupabaseClient | null;
  authSession: SupabaseAuthSession | null;
  authLoading: boolean;
};

export function useDictaAppProfileRuntime({
  syncConfig,
  supabaseClient,
  authSession,
  authLoading,
}: UseDictaAppProfileRuntimeOptions) {
  const [appProfile, setAppProfile] = useState<DictaAppProfile | null>(null);
  const [appProfileError, setAppProfileError] = useState('');
  const [visibleProfiles, setVisibleProfiles] = useState<DictaAppProfile[]>([]);
  const [adminProfileFilter, setAdminProfileFilter] = useState<string>('self');
  const [adminRemoteSessions, setAdminRemoteSessions] = useState<StoredSession[]>([]);
  const [adminRemoteStatus, setAdminRemoteStatus] = useState('');

  const openRouterAccessState = resolveOpenRouterAccessState({
    authRequired: syncConfig.authRequired,
    authLoading,
    hasAuthSession: Boolean(authSession),
    profile: appProfile,
    profileError: appProfileError,
  });
  const openRouterAccessAllowed = openRouterAccessState === 'allowed';
  const openRouterAccessMessage = 'OpenRouter access is disabled for this Dicta account. Contact the admin.';
  const effectiveProfileId = resolveEffectiveSyncProfileId({
    authRequired: syncConfig.authRequired,
    profile: appProfile,
    legacyProfileId: syncConfig.legacyProfileId,
  });
  const isCurrentProfileAdmin = isDictaAdmin(appProfile);

  useEffect(() => {
    if (!supabaseClient || !syncConfig.authRequired || !authSession?.user) return;
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
  }, [authSession?.user, supabaseClient, syncConfig.authRequired]);

  useEffect(() => {
    if (!supabaseClient || !isCurrentProfileAdmin) {
      setVisibleProfiles(appProfile ? [appProfile] : []);
      return;
    }
    let cancelled = false;
    loadVisibleDictaAppProfiles(supabaseClient)
      .then((profiles) => {
        if (!cancelled) setVisibleProfiles(profiles);
      })
      .catch(() => {
        if (!cancelled) setVisibleProfiles(appProfile ? [appProfile] : []);
      });
    return () => {
      cancelled = true;
    };
  }, [appProfile, isCurrentProfileAdmin, supabaseClient]);

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
  }, [adminProfileFilter, appProfile, isCurrentProfileAdmin, supabaseClient]);

  return {
    appProfile,
    setAppProfile,
    appProfileError,
    openRouterAccessState,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    visibleProfiles,
    setVisibleProfiles,
    adminProfileFilter,
    setAdminProfileFilter,
    adminRemoteSessions,
    adminRemoteStatus,
    effectiveProfileId,
    isCurrentProfileAdmin,
  };
}
