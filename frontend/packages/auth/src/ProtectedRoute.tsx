import React, { useEffect, useRef } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LOGIN_REDIRECT_DELAY_MS = 800;

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { configured, isAuthenticated, isLoading, login } = useAuth();
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (
      !configured ||
      isAuthenticated ||
      isLoading ||
      redirectStarted.current
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      redirectStarted.current = true;
      login();
    }, LOGIN_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [configured, isAuthenticated, isLoading, login]);

  if (!configured) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
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
          Sie werden zur Microsoft-Anmeldung weitergeleitet …
        </Typography>
        <CircularProgress size={28} />
        <Button variant="text" onClick={login} size="small">
          Falls Sie nicht weitergeleitet werden: Anmelden
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
};
