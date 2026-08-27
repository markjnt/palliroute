import { useCallback } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { isAuthConfigured, loginRequest } from './msalConfig';

export function useAuth() {
  const configured = isAuthConfigured();
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = instance.getActiveAccount() ?? accounts[0] ?? null;

  const login = useCallback(() => {
    if (!configured) return;
    void instance.loginRedirect(loginRequest);
  }, [configured, instance]);

  const logout = useCallback(() => {
    if (!configured) return;
    void instance.logoutRedirect({
      account: account ?? undefined,
      postLogoutRedirectUri: window.location.origin,
    });
  }, [configured, instance, account]);

  return {
    configured,
    isAuthenticated: configured ? isAuthenticated : true,
    isLoading: configured && inProgress !== InteractionStatus.None,
    account,
    displayName: account?.name ?? account?.username ?? null,
    email: account?.username ?? null,
    login,
    logout,
  };
}
