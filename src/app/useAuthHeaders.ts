import { useCallback } from 'react';

type AuthSessionLike = {
  access_token?: string | null;
} | null;

type UseAuthHeadersArgs = {
  authSession: AuthSessionLike;
};

export function useAuthHeaders({
  authSession,
}: UseAuthHeadersArgs) {
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = authSession?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authSession?.access_token]);

  return {
    getAuthHeaders,
  };
}
