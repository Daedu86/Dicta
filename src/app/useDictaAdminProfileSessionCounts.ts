import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictaAppProfile } from '../core/appProfiles';
import { DICTA_SYNC_TABLE } from '../core/supabaseSync';

type UseDictaAdminProfileSessionCountsOptions = {
  appProfile: DictaAppProfile | null;
  supabaseClient: SupabaseClient | null;
  isCurrentProfileAdmin: boolean;
  setAdminProfileSessionCounts: Dispatch<SetStateAction<Record<string, number>>>;
  setAdminRemoteStatus: Dispatch<SetStateAction<string>>;
};

export function useDictaAdminProfileSessionCounts({
  appProfile,
  supabaseClient,
  isCurrentProfileAdmin,
  setAdminProfileSessionCounts,
  setAdminRemoteStatus,
}: UseDictaAdminProfileSessionCountsOptions): void {
  useEffect(() => {
    if (!supabaseClient || !isCurrentProfileAdmin) {
      setAdminProfileSessionCounts(appProfile ? { [appProfile.profileId]: 0 } : {});
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabaseClient
          .from(DICTA_SYNC_TABLE)
          .select('profile_id')
          .eq('item_type', 'session');
        if (cancelled) return;
        if (error) throw error;
        const nextCounts: Record<string, number> = {};
        for (const row of data ?? []) {
          const profileId = typeof row.profile_id === 'string' ? row.profile_id.trim() : '';
          if (!profileId) continue;
          nextCounts[profileId] = (nextCounts[profileId] ?? 0) + 1;
        }
        setAdminProfileSessionCounts(nextCounts);
      } catch (error) {
        if (!cancelled) {
          setAdminProfileSessionCounts(appProfile ? { [appProfile.profileId]: 0 } : {});
          setAdminRemoteStatus(
            error instanceof Error
              ? `Failed to load admin session counts: ${error.message}`
              : 'Failed to load admin session counts.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appProfile, isCurrentProfileAdmin, setAdminProfileSessionCounts, setAdminRemoteStatus, supabaseClient]);
}
