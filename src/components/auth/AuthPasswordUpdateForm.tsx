import type { FormEvent } from 'react';
import { AuthStatusMessage } from './AuthStatusMessage';
import type { AuthMessageTone } from './AuthWorkspaceTypes';

export type AuthPasswordUpdateFormProps = {
  authNewPassword: string;
  authNewPasswordConfirm: string;
  authBusy: boolean;
  authMessage: string;
  authMessageTone: AuthMessageTone;
  authError: string;
  onUpdatePassword: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onShowSignIn: () => void;
  onAuthNewPasswordChange: (value: string) => void;
  onAuthNewPasswordConfirmChange: (value: string) => void;
};

export function AuthPasswordUpdateForm({
  authNewPassword,
  authNewPasswordConfirm,
  authBusy,
  authMessage,
  authMessageTone,
  authError,
  onUpdatePassword,
  onShowSignIn,
  onAuthNewPasswordChange,
  onAuthNewPasswordConfirmChange,
}: AuthPasswordUpdateFormProps) {
  return (
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
        <button type="button" className="auth-text-button" onClick={onShowSignIn}>
          Back to sign in
        </button>
      </form>
      <AuthStatusMessage authMessage={authMessage} authMessageTone={authMessageTone} authError={authError} />
    </>
  );
}
