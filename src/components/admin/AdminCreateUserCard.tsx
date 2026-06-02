import type { DictaAppRole } from '../../core/appProfiles';

type AdminCreateUserCardProps = {
  newUserEmail: string;
  newUserPassword: string;
  newUserDisplayName: string;
  newUserProfileId: string;
  newUserRole: DictaAppRole;
  newUserMessage: string;
  newUserBusy: boolean;
  onChangeNewUserEmail: (value: string) => void;
  onChangeNewUserPassword: (value: string) => void;
  onChangeNewUserDisplayName: (value: string) => void;
  onChangeNewUserProfileId: (value: string) => void;
  onChangeNewUserRole: (value: DictaAppRole) => void;
  onCreateUser: () => void;
};

export function AdminCreateUserCard({
  newUserEmail,
  newUserPassword,
  newUserDisplayName,
  newUserProfileId,
  newUserRole,
  newUserMessage,
  newUserBusy,
  onChangeNewUserEmail,
  onChangeNewUserPassword,
  onChangeNewUserDisplayName,
  onChangeNewUserProfileId,
  onChangeNewUserRole,
  onCreateUser,
}: AdminCreateUserCardProps) {
  return (
    <section className="dashboard-card admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Create user</h3>
          <p>Create an invite-only Supabase Auth user and map it to a separate Dicta profile.</p>
        </div>
      </div>
      <label>
        Email
        <input
          value={newUserEmail}
          onChange={(event) => onChangeNewUserEmail(event.target.value)}
          placeholder="mama@example.com"
        />
      </label>
      <label>
        Temporary password
        <input
          type="password"
          value={newUserPassword}
          onChange={(event) => onChangeNewUserPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
      </label>
      <label>
        Display name
        <input
          value={newUserDisplayName}
          onChange={(event) => onChangeNewUserDisplayName(event.target.value)}
          placeholder="Mama"
        />
      </label>
      <label>
        Profile id
        <input
          value={newUserProfileId}
          onChange={(event) => onChangeNewUserProfileId(event.target.value)}
          placeholder="mama"
        />
      </label>
      <label>
        Role
        <select
          value={newUserRole}
          onChange={(event) => onChangeNewUserRole(event.target.value === 'admin' ? 'admin' : 'member')}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={newUserBusy || !newUserEmail.trim() || newUserPassword.length < 8}
          onClick={() => void onCreateUser()}
        >
          {newUserBusy ? 'Creating...' : 'Create user'}
        </button>
      </div>
      {newUserMessage ? (
        <p
          className={
            newUserMessage.toLowerCase().includes('failed') || newUserMessage.toLowerCase().includes('required')
              ? 'error'
              : 'success'
          }
        >
          {newUserMessage}
        </p>
      ) : null}
    </section>
  );
}
