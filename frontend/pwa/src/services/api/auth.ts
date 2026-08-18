import { api } from '@palliroute/shared';
import type { Employee } from '@palliroute/models';

export interface AuthMeUnmapped {
  code: string;
  detail: string;
  admin_detail?: string;
  email?: string | null;
  token_emails?: string[];
  oid?: string | null;
  name?: string | null;
  entra_email_domain?: string;
  name_email_pattern?: string;
  admin_allowlist_configured?: boolean;
}

export interface AuthMeResponse {
  auth_mode: 'jwt' | 'internal' | 'disabled';
  oid?: string;
  email?: string;
  name?: string;
  employee: Employee | null;
  is_admin?: boolean;
  unmapped?: AuthMeUnmapped | null;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const response = await api.get<AuthMeResponse>('/auth/me');
  return response.data;
}
