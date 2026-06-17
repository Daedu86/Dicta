import type { FormEvent } from 'react';
import { AuthStatusMessage } from './AuthStatusMessage';
import type { AuthMessageTone } from './AuthWorkspaceTypes';

export type AuthPasswordResetFormProps = {
  authEmail: string;
  authBusy: boolean;
  authMessage: string;
  authMessageTone: AuthMessageTone;
  authError: string;
  onRequestPasswordReset: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onShowSignIn: () => void;
  onAuthEmailChange: (value: string) => void;
};

export function AuthPasswordResetForm({
  authEmail,
  authBusy,
  authMessage,
  authMessageTone,
  authError,
  onRequestPasswordReset,
  onShowSignIn,
  onAuthEmailChange,
}: AuthPasswordResetFormProps) {
  return (
    <>
      <form className="auth-form" onSubmit={(event) => void onRequestPasswordReset(event)}>
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
        <button type="submit" className="secondary-button" disabled={authBusy || !authEmail.trim()}>
          {authBusy ? 'Sending...' : 'Send reset email'}
        </button>
        <button type="button" className="auth-text-button" onClick={onShowSignIn}>
          Back to sign in
        </button>
      </form>
      <AuthStatusMessage authMessage={authMessage} authMessageTone={authMessageTone} authError={authError} />
    </>
  );
}
