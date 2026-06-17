import type { FormEvent } from 'react';

export type AuthView = 'signIn' | 'forgotPassword' | 'updatePassword';
export type AuthMessageTone = 'hint' | 'success' | 'error';

export type AuthProfileDisplay = {
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
