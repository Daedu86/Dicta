import { useState } from 'react';
import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import type { DictaSyncConfig } from '../core/supabaseSync';
import {
  isDictaAdmin,
  resolveEffectiveSyncProfileId,
  resolveOpenRouterAccessState,
  type DictaAppProfile,
} from '../core/appProfiles';
import { useDictaAdminProfileSessionCounts } from './useDictaAdminProfileSessionCounts';
import { useDictaAdminRemoteSessions } from './useDictaAdminRemoteSessions';
import { useDictaAppProfileLoader } from './useDictaAppProfileLoader';
import { useDictaAppProfileReset } from './useDictaAppProfileReset';
import { useVisibleDictaAppProfiles } from './useVisibleDictaAppProfiles';
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
  const [adminProfileSessionCounts, setAdminProfileSessionCounts] = useState<Record<string, number>>({});
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

  useDictaAppProfileReset({
    authSession,
    setAppProfile,
    setAppProfileError,
    setVisibleProfiles,
    setAdminProfileFilter,
    setAdminRemoteSessions,
    setAdminProfileSessionCounts,
    setAdminRemoteStatus,
  });
  useDictaAppProfileLoader({
    supabaseClient,
    authSession,
    authRequired: syncConfig.authRequired,
    setAppProfile,
    setAppProfileError,
  });
  useVisibleDictaAppProfiles({
    supabaseClient,
    appProfile,
    isCurrentProfileAdmin,
    setVisibleProfiles,
  });
  useDictaAdminRemoteSessions({
    adminProfileFilter,
    supabaseClient,
    isCurrentProfileAdmin,
    setAdminRemoteSessions,
    setAdminRemoteStatus,
  });
  useDictaAdminProfileSessionCounts({
    appProfile,
    supabaseClient,
    isCurrentProfileAdmin,
    setAdminProfileSessionCounts,
    setAdminRemoteStatus,
  });

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
    adminProfileSessionCounts,
    adminRemoteStatus,
    effectiveProfileId,
    isCurrentProfileAdmin,
  };
}
