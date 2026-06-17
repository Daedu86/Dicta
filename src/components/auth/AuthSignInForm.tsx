import type { FormEvent } from 'react';
import { AuthStatusMessage } from './AuthStatusMessage';
import type { AuthMessageTone } from './AuthWorkspaceTypes';

export type AuthSignInFormProps = {
  authEmail: string;
  authPassword: string;
  authMessage: string;
  authMessageTone: AuthMessageTone;
  authError: string;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onShowForgotPassword: () => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
};

export function AuthSignInForm({
  authEmail,
  authPassword,
  authMessage,
  authMessageTone,
  authError,
  onSignIn,
  onShowForgotPassword,
  onAuthEmailChange,
  onAuthPasswordChange,
}: AuthSignInFormProps) {
  return (
    <form className="auth-form" onSubmit={(event) => void onSignIn(event)}>
      <label>
        Email
        <input
          type="email"
          value={authEmail}
          onChange={(event) => onAuthEmailChange(event.target.value)}
          autoComplete="email"
          required
        />
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
      <button type="button" className="auth-text-button" onClick={onShowForgotPassword}>
        Forgot password?
      </button>
      <AuthStatusMessage authMessage={authMessage} authMessageTone={authMessageTone} authError={authError} />
    </form>
  );
}
