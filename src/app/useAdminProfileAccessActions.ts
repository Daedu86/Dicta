import { useCallback } from 'react';
import {
  normalizeDictaAppProfile,
  type DictaAppProfile,
} from '../core/appProfiles';

type AdminProfileAccessPatch = {
  canAccessOpenRouter: boolean;
  assignedOpenRouterModel: string;
  sessionLimit: number;
};

type UseAdminProfileAccessActionsArgs = {
  getAuthHeaders: () => Record<string, string>;
  appProfile: DictaAppProfile | null;
  setAppProfile: (profile: DictaAppProfile) => void;
  setVisibleProfiles: (updater: (current: DictaAppProfile[]) => DictaAppProfile[]) => void;
};

export function useAdminProfileAccessActions({
  getAuthHeaders,
  appProfile,
  setAppProfile,
  setVisibleProfiles,
}: UseAdminProfileAccessActionsArgs) {
  const updateAdminProfileAccess = useCallback(async (
    profile: DictaAppProfile,
    patch: AdminProfileAccessPatch,
  ): Promise<DictaAppProfile> => {
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        userId: profile.userId,
        canAccessOpenRouter: patch.canAccessOpenRouter,
        assignedOpenRouterModel: patch.assignedOpenRouterModel,
        sessionLimit: patch.sessionLimit,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Profile access update failed (${response.status}).`);
    }

    const payload = (await response.json()) as {
      profile?: {
        user_id: string;
        profile_id: string;
        display_name: string | null;
        role: string;
        active: boolean | null;
        can_access_openrouter?: boolean | null;
        assigned_openrouter_model?: string | null;
        session_limit?: number | null;
        created_at?: string;
        updated_at?: string;
      };
    };

    if (!payload.profile) throw new Error('Profile access update did not return a profile.');

    const updated = normalizeDictaAppProfile(payload.profile);
    setVisibleProfiles((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));

    if (appProfile?.userId === updated.userId) {
      setAppProfile(updated);
    }

    return updated;
  }, [
    appProfile?.userId,
    getAuthHeaders,
    setAppProfile,
    setVisibleProfiles,
  ]);

  return {
    updateAdminProfileAccess,
  };
}
