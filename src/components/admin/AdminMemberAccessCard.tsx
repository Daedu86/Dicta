import type { DictaAppProfile } from '../../core/appProfiles';
import type { OpenRouterModelSummary } from '../openrouter/types';

type AccessDraft = {
  canAccessOpenRouter: boolean;
  assignedOpenRouterModel: string;
  sessionLimit: string;
};

type AdminMemberAccessCardProps = {
  memberProfiles: DictaAppProfile[];
  accessDrafts: Record<string, AccessDraft>;
  accessBusyProfileId: string;
  accessMessage: string;
  memberModelOptions: OpenRouterModelSummary[];
  openRouterModels: OpenRouterModelSummary[];
  openRouterModelStatus: 'idle' | 'loading' | 'ready' | 'error';
  openRouterModelError: string;
  onRefreshOpenRouterModels: () => Promise<void>;
  onChangeAccessDraft: (profileId: string, draft: AccessDraft) => void;
  onSaveProfileAccess: (profile: DictaAppProfile) => void;
};

export function AdminMemberAccessCard({
  memberProfiles,
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
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void onSaveProfileAccess(profile)}
                >
                  {busy ? 'Saving...' : 'Save'}
                </button>
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
