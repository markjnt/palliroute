import React, { useEffect, useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { EventType, type AuthenticationResult } from '@azure/msal-browser';
import { setTokenProvider } from '@palliroute/shared';
import { getAccessToken } from './getAccessToken';
import { isAuthConfigured, msalInstance } from './msalConfig';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await msalInstance.initialize();

      if (isAuthConfigured()) {
        const result = await msalInstance.handleRedirectPromise();
        if (result?.account) {
          msalInstance.setActiveAccount(result.account);
        } else {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
          }
        }

        msalInstance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const payload = event.payload as AuthenticationResult;
            if (payload.account) {
              msalInstance.setActiveAccount(payload.account);
            }
          }
        });

        setTokenProvider(getAccessToken);
      } else {
        console.warn(
          'Azure auth not configured (runtime /config.js or VITE_AZURE_* ) — auth disabled in UI'
        );
      }

      if (!cancelled) {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
};
