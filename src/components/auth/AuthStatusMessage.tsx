import type { AuthMessageTone } from './AuthWorkspaceTypes';

export type AuthStatusMessageProps = {
  authMessage: string;
  authMessageTone: AuthMessageTone;
  authError: string;
};

function getAuthMessageClassName(authMessageTone: AuthMessageTone): string {
  if (authMessageTone === 'success') return 'success';
  if (authMessageTone === 'error') return 'error';
  return 'hint';
}

export function AuthStatusMessage({
  authMessage,
  authMessageTone,
  authError,
}: AuthStatusMessageProps) {
  return (
    <>
      {authMessage ? <p className={getAuthMessageClassName(authMessageTone)}>{authMessage}</p> : null}
      {authError ? <p className="error">{authError}</p> : null}
    </>
  );
}
