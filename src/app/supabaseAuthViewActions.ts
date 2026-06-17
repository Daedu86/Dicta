import type { AuthView } from './sessionTypes';
import type { SupabaseAuthActionSetters } from './supabaseAuthActionTypes';

type SupabaseAuthViewActionOptions = Pick<
  SupabaseAuthActionSetters,
  'setAuthView' | 'setAuthError' | 'setAuthMessage' | 'setAuthNewPassword' | 'setAuthNewPasswordConfirm'
> & {
  view: AuthView;
};

export function showSupabaseAuthView({
  view,
  setAuthView,
  setAuthError,
  setAuthMessage,
  setAuthNewPassword,
  setAuthNewPasswordConfirm,
}: SupabaseAuthViewActionOptions): void {
  setAuthView(view);
  setAuthError('');
  setAuthMessage('');
  if (view !== 'updatePassword') {
    setAuthNewPassword('');
    setAuthNewPasswordConfirm('');
  }
}
