import React from 'react';
import { Button } from '@mui/material';
import { useAuth } from './useAuth';

export const LoginButton: React.FC = () => {
  const { login, configured } = useAuth();
  if (!configured) return null;
  return (
    <Button variant="contained" onClick={login}>
      Anmelden
    </Button>
  );
};

export const LogoutButton: React.FC = () => {
  const { logout, configured, isAuthenticated } = useAuth();
  if (!configured || !isAuthenticated) return null;
  return (
    <Button variant="outlined" onClick={logout}>
      Abmelden
    </Button>
  );
};
