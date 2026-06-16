import { useState } from 'react';
import type { DictaAppRole } from '../../core/appProfiles';

type UseAdminCreateUserArgs = {
  authHeaders: Record<string, string>;
};

export function useAdminCreateUser({ authHeaders }: UseAdminCreateUserArgs) {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserProfileId, setNewUserProfileId] = useState('');
  const [newUserRole, setNewUserRole] = useState<DictaAppRole>('member');
  const [newUserMessage, setNewUserMessage] = useState('');
  const [newUserBusy, setNewUserBusy] = useState(false);

  async function createDictaUser(): Promise<void> {
    setNewUserBusy(true);
    setNewUserMessage('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName,
          profileId: newUserProfileId,
          role: newUserRole,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `User creation failed (${response.status}).`);
      }
      const payload = (await response.json()) as { displayName?: string; profileId?: string };
      setNewUserMessage(`Created ${payload.displayName ?? newUserEmail} Â· profile ${payload.profileId ?? newUserProfileId}. Refresh Admin to see the profile list.`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserProfileId('');
      setNewUserRole('member');
    } catch (error) {
      setNewUserMessage(error instanceof Error ? error.message : 'User creation failed.');
    } finally {
      setNewUserBusy(false);
    }
  }

  return {
    newUserEmail,
    newUserPassword,
    newUserDisplayName,
    newUserProfileId,
    newUserRole,
    newUserMessage,
    newUserBusy,
    setNewUserEmail,
    setNewUserPassword,
    setNewUserDisplayName,
    setNewUserProfileId,
    setNewUserRole,
    createDictaUser,
  };
}
