import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest, msalInstance } from './msalConfig';

export async function getAccessToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    return null;
  }

  const account = msalInstance.getActiveAccount() ?? accounts[0];
  if (!msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(account);
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect(loginRequest);
      return null;
    }
    console.error('Token acquisition failed', error);
    return null;
  }
}
