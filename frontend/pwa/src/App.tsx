import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box, Typography } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ProtectedRoute, useAuth, LogoutButton, isAuthConfigured } from '@palliroute/auth';
import InstallPrompt from './components/install/InstallPrompt';
import MainLayout from './components/layout/MainLayout';
import { useAuthMe } from './services/queries/useAuthMe';
import { useUserStore } from './stores/useUserStore';
import type { AuthMeResponse } from './services/api/auth';

const theme = createTheme({
  palette: {
    primary: {
      main: '#007AFF',
    },
    secondary: {
      main: '#FF3B30',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1d1d1f',
      secondary: '#86868b',
    },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      },
    },
  },
});

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isPwaInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function AccountDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <Box sx={{ textAlign: 'left' }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: mono && value ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
          wordBreak: 'break-all',
          color: value ? 'text.primary' : 'text.secondary',
        }}
      >
        {value || 'nicht im Konto enthalten'}
      </Typography>
    </Box>
  );
}

function AuthStatusScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
      px={2}
    >
      <Typography variant="h6" textAlign="center">
        {title}
      </Typography>
      {children}
      <LogoutButton />
    </Box>
  );
}

function UnmappedEmployeeScreen({ me }: { me: AuthMeResponse }) {
  const { displayName, email: msalEmail } = useAuth();
  const unmapped = me.unmapped;
  const name = unmapped?.name || me.name || displayName;
  const email = unmapped?.email || me.email || msalEmail;
  const oid = unmapped?.oid || me.oid;
  const pattern = unmapped?.name_email_pattern;

  return (
    <AuthStatusScreen title="Kein Mitarbeiter hinterlegt">
      <Typography color="text.secondary" textAlign="center" maxWidth={420}>
        {unmapped?.detail ||
          'Ihr Microsoft-Konto (Entra ID) ist keinem Mitarbeiter in PalliRoute zugeordnet.'}
      </Typography>
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <AccountDetail label="Name" value={name} />
        <AccountDetail label="Entra-E-Mail" value={email} mono />
        <AccountDetail label="Entra-OID" value={oid} mono />
        {pattern ? <AccountDetail label="Erwartetes Namensmuster" value={pattern} mono /> : null}
      </Box>
      <Typography color="text.secondary" textAlign="center" maxWidth={420} variant="body2">
        Bitte wenden Sie sich an einen Admin und geben Sie diese Angaben weiter. Der Mitarbeiter
        muss in der Excel stehen und über E-Mail oder Namensmuster zu diesem Konto passen.
      </Typography>
    </AuthStatusScreen>
  );
}

/** After login: map Entra account → employee, then show the app. */
const AuthenticatedApp: React.FC = () => {
  const { data: me, isLoading, isError } = useAuthMe();
  const { setSelectedUser } = useUserStore();

  useEffect(() => {
    const employeeId = me?.employee?.id;
    if (employeeId) {
      // Only when the authenticated employee changes (login), not on every manual switch
      setSelectedUser(employeeId);
    }
  }, [me?.employee?.id, setSelectedUser]);

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <AuthStatusScreen title="Anmeldung fehlgeschlagen">
        <Typography color="text.secondary" textAlign="center" maxWidth={420}>
          Konnte Benutzerdaten nicht laden. Bitte erneut anmelden.
        </Typography>
      </AuthStatusScreen>
    );
  }

  if (me && !me.employee && !me.is_admin) {
    return <UnmappedEmployeeScreen me={me} />;
  }

  return <MainLayout />;
};

/** Installed PWA only: login (if configured) → app. */
const InstalledShell: React.FC = () => {
  if (!isAuthConfigured()) {
    return <MainLayout />;
  }

  return (
    <ProtectedRoute>
      <AuthenticatedApp />
    </ProtectedRoute>
  );
};

/**
 * Install first (no login / no API), then auth + app in standalone mode.
 */
const AppRoutes: React.FC = () => {
  if (!isPwaInstalled()) {
    return (
      <Routes>
        <Route path="/install" element={<InstallPrompt />} />
        <Route path="*" element={<Navigate to="/install" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<InstalledShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const isTouchDevice = 'ontouchstart' in window;
  const backend = isTouchDevice ? TouchBackend : HTML5Backend;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndProvider backend={backend}>
        <Router>
          <AppRoutes />
        </Router>
      </DndProvider>
    </ThemeProvider>
  );
};

export default App;
