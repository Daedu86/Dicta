import { useEffect, useState } from 'react';
import type { DictaAppProfile } from '../../core/appProfiles';
import { buildOpenRouterModelOptions } from '../openrouter/openRouterViewHelpers';
import type { OpenRouterModelSummary } from '../openrouter/types';
import type { AdminAccessDraft, ProfileAccessPatch } from './AdminWorkspaceTypes';

type UseAdminMemberAccessArgs = {
  visibleProfiles: DictaAppProfile[];
  openRouterModels: OpenRouterModelSummary[];
  onUpdateProfileAccess: (
    profile: DictaAppProfile,
    patch: ProfileAccessPatch,
  ) => Promise<DictaAppProfile>;
};

export function useAdminMemberAccess({
  visibleProfiles,
  openRouterModels,
  onUpdateProfileAccess,
}: UseAdminMemberAccessArgs) {
  const [accessDrafts, setAccessDrafts] = useState<Record<string, AdminAccessDraft>>({});
  const [accessBusyProfileId, setAccessBusyProfileId] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const memberProfiles = visibleProfiles.filter((profile) => profile.role === 'member');
  const memberModelOptions = buildOpenRouterModelOptions(
    openRouterModels,
    memberProfiles.map((profile) => profile.assignedOpenRouterModel),
  );

  useEffect(() => {
    setAccessDrafts((current) => {
      const next = { ...current };
      for (const profile of visibleProfiles) {
        if (profile.role !== 'member') continue;
        if (!next[profile.profileId]) {
          next[profile.profileId] = buildAccessDraft(profile);
        }
      }
      return next;
    });
  }, [visibleProfiles]);

  async function saveProfileAccess(profile: DictaAppProfile): Promise<void> {
    const draft = accessDrafts[profile.profileId] ?? buildAccessDraft(profile);
    const sessionLimitNumber = Number(draft.sessionLimit);
    if (!Number.isFinite(sessionLimitNumber) || sessionLimitNumber < 0) {
      setAccessMessage('Session limit must be zero or higher.');
      return;
    }
    setAccessBusyProfileId(profile.profileId);
    setAccessMessage('');
    try {
      const updated = await onUpdateProfileAccess(profile, {
        canAccessOpenRouter: draft.canAccessOpenRouter,
        assignedOpenRouterModel: draft.assignedOpenRouterModel.trim(),
        sessionLimit: Math.floor(sessionLimitNumber),
      });
      updateSavedAccessDraft(updated);
      setAccessMessage(`Updated ${updated.displayName}.`);
    } catch (error) {
      setAccessMessage(error instanceof Error ? error.message : 'Profile access update failed.');
    } finally {
      setAccessBusyProfileId('');
    }
  }

  function updateAccessDraft(profileId: string, draft: AdminAccessDraft): void {
    setAccessDrafts((current) => ({
      ...current,
      [profileId]: draft,
    }));
  }

  function resetProfileSessionLimit(profile: DictaAppProfile): void {
    const nextLimit = profile.role === 'admin' ? null : 15;
    const draft = accessDrafts[profile.profileId] ?? buildAccessDraft(profile);
    void onUpdateProfileAccess(profile, {
      canAccessOpenRouter: draft.canAccessOpenRouter,
      assignedOpenRouterModel: draft.assignedOpenRouterModel.trim(),
      sessionLimit: nextLimit,
    }).then((updated) => {
      updateSavedAccessDraft(updated);
      setAccessMessage(`Reset session limit for ${updated.displayName}.`);
    }).catch((error) => {
      setAccessMessage(error instanceof Error ? error.message : 'Session limit reset failed.');
    });
  }

  function updateSavedAccessDraft(updated: DictaAppProfile): void {
    setAccessDrafts((current) => ({
      ...current,
      [updated.profileId]: buildAccessDraft(updated),
    }));
  }

  return {
    accessDrafts,
    accessBusyProfileId,
    accessMessage,
    memberProfiles,
    memberModelOptions,
    updateAccessDraft,
    saveProfileAccess,
    resetProfileSessionLimit,
  };
}

function buildAccessDraft(profile: DictaAppProfile): AdminAccessDraft {
  return {
    canAccessOpenRouter: profile.canAccessOpenRouter,
    assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
    sessionLimit: String(profile.sessionLimit ?? 15),
  };
}
