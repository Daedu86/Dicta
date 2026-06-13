import type { DictaAppProfile } from '../../core/appProfiles';

type AdminUsersCardProps = {
  visibleProfiles: DictaAppProfile[];
  profileSessionCounts: Record<string, number>;
  selectedProfileFilter: string;
  onChangeProfileFilter: (value: string) => void;
  remoteAdminStatus: string;
};

export function AdminUsersCard({
  visibleProfiles,
  profileSessionCounts,
  selectedProfileFilter,
  onChangeProfileFilter,
  remoteAdminStatus,
}: AdminUsersCardProps) {
  if (visibleProfiles.length === 0) {
    return null;
  }

  return (
    <section className="dashboard-card admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Users</h3>
          <p>Profiles visible to this account. Session sync remains scoped to the active signed-in profile.</p>
        </div>
      </div>
      <label>
        Admin profile filter
        <select value={selectedProfileFilter} onChange={(event) => onChangeProfileFilter(event.target.value)}>
          <option value="self">Current profile</option>
          <option value="all">All profiles</option>
          {visibleProfiles.map((profile) => (
            <option key={profile.profileId} value={profile.profileId}>
              {profile.displayName} · {profile.role}
            </option>
          ))}
        </select>
      </label>
      {remoteAdminStatus ? (
        <p className={remoteAdminStatus.toLowerCase().includes('failed') ? 'error' : 'hint'}>{remoteAdminStatus}</p>
      ) : null}
      <div className="admin-table">
        <div className="admin-table-row admin-table-header">
          <span>Name</span>
          <span>Role</span>
          <span>Profile</span>
          <span>Sessions done</span>
        </div>
        {visibleProfiles.map((profile) => (
          <div key={profile.profileId} className="admin-table-row">
            <span>{profile.displayName}</span>
            <span>{profile.active ? profile.role : 'inactive'}</span>
            <span>
              {profile.profileId}
              <small>
                OpenRouter {profile.canAccessOpenRouter ? 'enabled' : 'disabled'} · sessions{' '}
                {profile.role === 'admin' ? 'unlimited' : profile.sessionLimit ?? 15}
                {profile.role === 'member' && profile.assignedOpenRouterModel ? ` · model ${profile.assignedOpenRouterModel}` : ''}
              </small>
            </span>
            <span>{profileSessionCounts[profile.profileId] ?? 0}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
