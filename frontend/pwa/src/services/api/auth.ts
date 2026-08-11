import { api } from '@palliroute/shared';
import type { Employee } from '@palliroute/models';

export interface AuthMeResponse {
  auth_mode: 'jwt' | 'internal' | 'disabled';
  oid?: string;
  email?: string;
  name?: string;
  employee: Employee | null;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const response = await api.get<AuthMeResponse>('/auth/me');
  return response.data;
}
