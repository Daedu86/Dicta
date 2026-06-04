import type { FormEvent } from 'react';
import { PerfDiagnosticsOverlay } from '../PerfDiagnosticsOverlay';

type AuthView = 'signIn' | 'forgotPassword' | 'updatePassword';
type AuthMessageTone = 'hint' | 'success' | 'error';

type AuthProfileDisplay = {
  displayName?: string | null;
};

export type AuthWorkspaceProps = {
  themeMode: 'dark' | 'light';
  authLoading: boolean;
  authView: AuthView;
  authSession: unknown | null;
  appProfile: AuthProfileDisplay | null;
  appProfileError: string;
  localStorageReadyForEffectiveProfile: boolean;
  supabaseInitialSyncPending: boolean;
  effectiveProfileId: string;
  authEmail: string;
  authPassword: string;
  authNewPassword: string;
  authNewPasswordConfirm: string;
  authBusy: boolean;
  authMessage: string;
  authMessageTone: AuthMessageTone;
  authError: string;
  perfDiagnosticsEnabled: boolean;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onRequestPasswordReset: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onUpdatePassword: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onShowAuthView: (view: AuthView) => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthNewPasswordChange: (value: string) => void;
  onAuthNewPasswordConfirmChange: (value: string) => void;
};

function AuthStatusMessage({
  authMessage,
  authMessageTone,
  authError,
}: {
  authMessage: string;
  authMessageTone: AuthMessageTone;
  authError: string;
}) {
  return (
    <>
      {authMessage ? <p className={authMessageTone === 'success' ? 'success' : authMessageTone === 'error' ? 'error' : 'hint'}>{authMessage}</p> : null}
      {authError ? <p className="error">{authError}</p> : null}
    </>
  );
}

export function AuthWorkspace({
  themeMode,
  authLoading,
  authView,
  authSession,
  appProfile,
  appProfileError,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  effectiveProfileId,
  authEmail,
  authPassword,
  authNewPassword,
  authNewPasswordConfirm,
  authBusy,
  authMessage,
  authMessageTone,
  authError,
  perfDiagnosticsEnabled,
  onSignIn,
  onRequestPasswordReset,
  onUpdatePassword,
  onSignOut,
  onShowAuthView,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthNewPasswordChange,
  onAuthNewPasswordConfirmChange,
}: AuthWorkspaceProps) {
  return (
    <main className={`app auth-app ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
      <section className="auth-panel">
        <div className="brand-mark auth-brand-mark">
          <span className="brand-mark-icon" aria-hidden="true">D</span>
        </div>
        <div>
          <p className="dashboard-eyebrow">Dicta access</p>
          <h1>Sign in</h1>
          <p className="dashboard-meta">Use the Supabase account assigned to your Dicta profile.</p>
        </div>
        {authLoading ? (
          <p className="hint">Checking session...</p>
        ) : authSession && !appProfile && !appProfileError ? (
          <p className="hint">Loading Dicta profile...</p>
        ) : authSession && appProfile && !localStorageReadyForEffectiveProfile ? (
          <p className="hint">Preparing local storage for {appProfile.displayName ?? effectiveProfileId}...</p>
        ) : authSession && appProfile && supabaseInitialSyncPending ? (
          <p className="hint">Synchronizing latest Dicta sessions...</p>
        ) : authSession && appProfileError ? (
          <>
            <p className="error">{appProfileError}</p>
            <button type="button" className="secondary-button" onClick={() => void onSignOut()}>
              Sign out
            </button>
          </>
        ) : authView === 'updatePassword' ? (
          <>
            <form className="auth-form" onSubmit={(event) => void onUpdatePassword(event)}>
              <label>
                New password
                <input
                  type="password"
                  value={authNewPassword}
                  onChange={(event) => onAuthNewPasswordChange(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={authNewPasswordConfirm}
                  onChange={(event) => onAuthNewPasswordConfirmChange(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </label>
              <button
                type="submit"
                className="secondary-button"
                disabled={authBusy || authNewPassword.length < 8 || authNewPasswordConfirm.length < 8}
              >
                {authBusy ? 'Saving...' : 'Save new password'}
              </button>
              <button type="button" className="auth-text-button" onClick={() => onShowAuthView('signIn')}>
                Back to sign in
              </button>
            </form>
            <AuthStatusMessage authMessage={authMessage} authMessageTone={authMessageTone} authError={authError} />
          </>
        ) : authView === 'forgotPassword' ? (
          <>
            <form className="auth-form" onSubmit={(event) => void onRequestPasswordReset(event)}>
              <label>
                Email
                <input type="email" value={authEmail} onChange={(event) => onAuthEmailChange(event.target.value)} autoComplete="email" required />
              </label>
              <button type="submit" className="secondary-button" disabled={authBusy || !authEmail.trim()}>
                {authBusy ? 'Sending...' : 'Send reset email'}
              </button>
              <button type="button" className="auth-text-button" onClick={() => onShowAuthView('signIn')}>
                Back to sign in
              </button>
            </form>
            <AuthStatusMessage authMessage={authMessage} authMessageTone={authMessageTone} authError={authError} />
          </>
        ) : (
          <form className="auth-form" onSubmit={(event) => void onSignIn(event)}>
            <label>
              Email
              <input type="email" value={authEmail} onChange={(event) => onAuthEmailChange(event.target.value)} autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(event) => onAuthPasswordChange(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit" className="secondary-button" disabled={!authEmail.trim() || !authPassword}>
              Sign in
            </button>
            <button type="button" className="auth-text-button" onClick={() => onShowAuthView('forgotPassword')}>
              Forgot password?
            </button>
            <AuthStatusMessage authMessage={authMessage} authMessageTone={authMessageTone} authError={authError} />
          </form>
        )}
      </section>
      <PerfDiagnosticsOverlay enabled={perfDiagnosticsEnabled} />
    </main>
  );
}
