import type { AuthProfileDisplay } from './AuthWorkspaceTypes';

export type AuthSessionGateProps = {
  authLoading: boolean;
  authSession: unknown | null;
  appProfile: AuthProfileDisplay | null;
  appProfileError: string;
  localStorageReadyForEffectiveProfile: boolean;
  supabaseInitialSyncPending: boolean;
  effectiveProfileId: string;
  onSignOut: () => void | Promise<void>;
};

export function AuthSessionGate({
  authLoading,
  authSession,
  appProfile,
  appProfileError,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  effectiveProfileId,
  onSignOut,
}: AuthSessionGateProps) {
  if (authLoading) {
    return <p className="hint">Checking session...</p>;
  }

  if (authSession && !appProfile && !appProfileError) {
    return <p className="hint">Loading Dicta profile...</p>;
  }

  if (authSession && appProfile && !localStorageReadyForEffectiveProfile) {
    return <p className="hint">Preparing local storage for {appProfile.displayName ?? effectiveProfileId}...</p>;
  }

  if (authSession && appProfile && supabaseInitialSyncPending) {
    return <p className="hint">Synchronizing latest Dicta sessions...</p>;
  }

  if (authSession && appProfileError) {
    return (
      <>
        <p className="error">{appProfileError}</p>
        <button type="button" className="secondary-button" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </>
    );
  }

  return null;
}
