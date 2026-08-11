import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { configured, isAuthenticated, isLoading, login } = useAuth();

  if (!configured) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
        px={2}
      >
        <Typography variant="h5" fontWeight={600}>
          PalliRoute
        </Typography>
        <Typography color="text.secondary" textAlign="center">
          Bitte mit Ihrem Organisationskonto anmelden.
        </Typography>
        <Button variant="contained" onClick={login} size="large">
          Anmelden
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
};
