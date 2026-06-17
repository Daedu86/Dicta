import type { Session as SupabaseAuthSession, SupabaseClient } from '@supabase/supabase-js';
import type { DictaAppProfile } from '../core/appProfiles';
import type { AuthView } from './sessionTypes';

export type AuthMessageTone = 'hint' | 'success' | 'error';

export type SupabaseAuthActionSetters = {
  setAuthSession: (session: SupabaseAuthSession | null) => void;
  setAppProfile: (profile: DictaAppProfile | null) => void;
  setAuthEmail: (email: string) => void;
  setAuthPassword: (value: string) => void;
  setAuthNewPassword: (value: string) => void;
  setAuthNewPasswordConfirm: (value: string) => void;
  setAuthView: (view: AuthView) => void;
  setAuthError: (message: string) => void;
  setAuthMessage: (message: string) => void;
  setAuthMessageTone: (tone: AuthMessageTone) => void;
  setAuthBusy: (busy: boolean) => void;
};

export type UseSupabaseAuthActionsOptions = SupabaseAuthActionSetters & {
  supabaseClient: SupabaseClient | null;
  authSession: SupabaseAuthSession | null;
  authEmail: string;
  authPassword: string;
  authNewPassword: string;
  authNewPasswordConfirm: string;
};
