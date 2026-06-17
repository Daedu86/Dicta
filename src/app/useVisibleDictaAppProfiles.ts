import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadVisibleDictaAppProfiles, type DictaAppProfile } from '../core/appProfiles';

type UseVisibleDictaAppProfilesOptions = {
  supabaseClient: SupabaseClient | null;
  appProfile: DictaAppProfile | null;
  isCurrentProfileAdmin: boolean;
  setVisibleProfiles: Dispatch<SetStateAction<DictaAppProfile[]>>;
};

export function useVisibleDictaAppProfiles({
  supabaseClient,
  appProfile,
  isCurrentProfileAdmin,
  setVisibleProfiles,
}: UseVisibleDictaAppProfilesOptions): void {
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
  }, [appProfile, isCurrentProfileAdmin, setVisibleProfiles, supabaseClient]);
}
