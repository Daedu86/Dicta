import { AuthPasswordResetForm } from './AuthPasswordResetForm';
import { AuthPasswordUpdateForm } from './AuthPasswordUpdateForm';
import { AuthSessionGate } from './AuthSessionGate';
import { AuthSignInForm } from './AuthSignInForm';
import type { AuthWorkspaceProps } from './AuthWorkspaceTypes';

type AuthWorkspaceContentProps = Omit<AuthWorkspaceProps, 'themeMode' | 'perfDiagnosticsEnabled'>;

export function AuthWorkspaceContent({
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
  onSignIn,
  onRequestPasswordReset,
  onUpdatePassword,
  onSignOut,
  onShowAuthView,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthNewPasswordChange,
  onAuthNewPasswordConfirmChange,
}: AuthWorkspaceContentProps) {
  const sessionGate = (
    <AuthSessionGate
      authLoading={authLoading}
      authSession={authSession}
      appProfile={appProfile}
      appProfileError={appProfileError}
      localStorageReadyForEffectiveProfile={localStorageReadyForEffectiveProfile}
      supabaseInitialSyncPending={supabaseInitialSyncPending}
      effectiveProfileId={effectiveProfileId}
      onSignOut={onSignOut}
    />
  );

  if (authLoading || authSession) {
    return sessionGate;
  }

  if (authView === 'updatePassword') {
    return (
      <AuthPasswordUpdateForm
        authNewPassword={authNewPassword}
        authNewPasswordConfirm={authNewPasswordConfirm}
        authBusy={authBusy}
        authMessage={authMessage}
        authMessageTone={authMessageTone}
        authError={authError}
        onUpdatePassword={onUpdatePassword}
        onShowSignIn={() => onShowAuthView('signIn')}
        onAuthNewPasswordChange={onAuthNewPasswordChange}
        onAuthNewPasswordConfirmChange={onAuthNewPasswordConfirmChange}
      />
    );
  }

  if (authView === 'forgotPassword') {
    return (
      <AuthPasswordResetForm
        authEmail={authEmail}
        authBusy={authBusy}
        authMessage={authMessage}
        authMessageTone={authMessageTone}
        authError={authError}
        onRequestPasswordReset={onRequestPasswordReset}
        onShowSignIn={() => onShowAuthView('signIn')}
        onAuthEmailChange={onAuthEmailChange}
      />
    );
  }

  return (
    <AuthSignInForm
      authEmail={authEmail}
      authPassword={authPassword}
      authMessage={authMessage}
      authMessageTone={authMessageTone}
      authError={authError}
      onSignIn={onSignIn}
      onShowForgotPassword={() => onShowAuthView('forgotPassword')}
      onAuthEmailChange={onAuthEmailChange}
      onAuthPasswordChange={onAuthPasswordChange}
    />
  );
}
