import { useMemo } from 'react';
import {
  createDictaSupabaseClient,
  getDictaSyncConfig,
} from '../core/supabaseSync';

export function useDictaSupabaseRuntime() {
  const syncConfig = useMemo(() => getDictaSyncConfig(import.meta.env), []);
  const supabaseClient = useMemo(() => createDictaSupabaseClient(syncConfig), [syncConfig]);

  return {
    syncConfig,
    supabaseClient,
  };
}
