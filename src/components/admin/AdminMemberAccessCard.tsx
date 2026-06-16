import type { DictaAppProfile } from '../../core/appProfiles';
import type { OpenRouterModelSummary } from '../openrouter/types';
import type { AdminAccessDraft } from './AdminWorkspaceTypes';

type AdminMemberAccessCardProps = {
  memberProfiles: DictaAppProfile[];
  profileSessionCounts: Record<string, number>;
  accessDrafts: Record<string, AdminAccessDraft>;
  accessBusyProfileId: string;
  accessMessage: string;
  memberModelOptions: OpenRouterModelSummary[];
  openRouterModels: OpenRouterModelSummary[];
  openRouterModelStatus: 'idle' | 'loading' | 'ready' | 'error';
  openRouterModelError: string;
  onRefreshOpenRouterModels: () => Promise<void>;
  onChangeAccessDraft: (profileId: string, draft: AdminAccessDraft) => void;
  onSaveProfileAccess: (profile: DictaAppProfile) => void;
  onResetSessionLimit: (profile: DictaAppProfile) => void;
};

export function AdminMemberAccessCard({
  memberProfiles,
  profileSessionCounts,
  accessDrafts,
  accessBusyProfileId,
  accessMessage,
  memberModelOptions,
  openRouterModels,
  openRouterModelStatus,
  openRouterModelError,
  onRefreshOpenRouterModels,
  onChangeAccessDraft,
  onSaveProfileAccess,
  onResetSessionLimit,
}: AdminMemberAccessCardProps) {
  return (
    <section className="dashboard-card admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Member access</h3>
          <p>Control OpenRouter, assigned model, and dictation-session quota for non-admin accounts.</p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void onRefreshOpenRouterModels()}
            disabled={openRouterModelStatus === 'loading'}
          >
            {openRouterModelStatus === 'loading' ? 'Refreshing...' : 'Refresh free models'}
          </button>
        </div>
      </div>
      {openRouterModelStatus === 'ready' ? (
        <p className="hint">{openRouterModels.length} free model(s) loaded for assignment.</p>
      ) : null}
      {openRouterModelError ? <p className="error">{openRouterModelError}</p> : null}
      {memberProfiles.length > 0 ? (
        <div className="admin-access-table">
          <div className="admin-access-row admin-table-header">
            <span>Member</span>
            <span>OpenRouter</span>
            <span>Assigned LLM</span>
            <span>Sessions done</span>
            <span>Session limit</span>
            <span>Action</span>
          </div>
          {memberProfiles.map((profile) => {
            const draft = accessDrafts[profile.profileId] ?? {
              canAccessOpenRouter: profile.canAccessOpenRouter,
              assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
              sessionLimit: String(profile.sessionLimit ?? 15),
            };
            const busy = accessBusyProfileId === profile.profileId;
            return (
              <div key={profile.profileId} className="admin-access-row">
                <span>
                  {profile.displayName}
                  <small>{profile.profileId}</small>
                </span>
                <label className="admin-access-toggle">
                  <input
                    type="checkbox"
                    checked={draft.canAccessOpenRouter}
                    onChange={(event) =>
                      onChangeAccessDraft(profile.profileId, {
                        ...draft,
                        canAccessOpenRouter: event.target.checked,
                      })
                    }
                  />
                  <span>{draft.canAccessOpenRouter ? 'Allowed' : 'Blocked'}</span>
                </label>
                <select
                  value={draft.assignedOpenRouterModel}
                  onChange={(event) =>
                    onChangeAccessDraft(profile.profileId, {
                      ...draft,
                      assignedOpenRouterModel: event.target.value,
                    })
                  }
                >
                  <option value="">No assigned model</option>
                  {memberModelOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                      {model.context_length ? ` (${model.context_length} ctx)` : ''}
                    </option>
                  ))}
                </select>
                <span className="admin-access-session-count">
                  {profileSessionCounts[profile.profileId] ?? 0}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.sessionLimit}
                  onChange={(event) =>
                    onChangeAccessDraft(profile.profileId, {
                      ...draft,
                      sessionLimit: event.target.value,
                    })
                  }
                />
                <div className="admin-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => void onSaveProfileAccess(profile)}
                  >
                    {busy ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => void onResetSessionLimit(profile)}
                    title={profile.role === 'admin' ? 'Reset admin session limit to unlimited' : 'Reset member session limit to default (15)'}
                  >
                    Reset limit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="hint">No member profiles are visible yet.</p>
      )}
      {accessMessage ? (
        <p
          className={
            accessMessage.toLowerCase().includes('failed') ||
            accessMessage.toLowerCase().includes('required') ||
            accessMessage.toLowerCase().includes('must')
              ? 'error'
              : 'success'
          }
        >
          {accessMessage}
        </p>
      ) : null}
    </section>
  );
}
