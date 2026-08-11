import type { Configuration, RedirectRequest } from '@azure/msal-browser';
import { LogLevel, PublicClientApplication } from '@azure/msal-browser';

export type PallirouteRuntimeConfig = {
  azureTenantId?: string;
  azureClientId?: string;
};

declare global {
  interface Window {
    __PALLIROUTE_CONFIG__?: PallirouteRuntimeConfig;
  }
}

function readAuthIds(): { tenantId?: string; clientId?: string } {
  const runtime = typeof window !== 'undefined' ? window.__PALLIROUTE_CONFIG__ : undefined;
  const tenantId =
    runtime?.azureTenantId?.trim() ||
    (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined)?.trim() ||
    undefined;
  const clientId =
    runtime?.azureClientId?.trim() ||
    (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined)?.trim() ||
    undefined;
  return { tenantId: tenantId || undefined, clientId: clientId || undefined };
}

const { tenantId, clientId } = readAuthIds();

export function isAuthConfigured(): boolean {
  return Boolean(tenantId && clientId);
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId || 'missing-client-id',
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
    },
  },
};

/** Access token scopes for our API (same app registration). Expose scope `access_as_user` in Entra. */
export const loginRequest: RedirectRequest = {
  scopes: clientId
    ? ['openid', 'profile', 'email', `api://${clientId}/access_as_user`]
    : ['openid', 'profile', 'email'],
};

export const msalInstance = new PublicClientApplication(msalConfig);
