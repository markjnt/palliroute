import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MainLayout } from './components/layout/MainLayout';
import { MapView } from './components/layout/MainViewMap';
import { OnCallPlanningView } from './components/oncall/OnCallPlanningView';

// Design: eine zentrale Theme-Definition — Farben, Radien, Schatten und Komponenten-Defaults.
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
    divider: 'rgba(0, 0, 0, 0.09)',
    action: {
      hover: 'rgba(0, 0, 0, 0.06)',
      selected: 'rgba(0, 122, 255, 0.08)',
      focus: 'rgba(0, 122, 255, 0.12)',
    },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: theme.spacing(2.5),
          transition: theme.transitions.create(['background-color', 'border-color', 'color', 'box-shadow'], {
            duration: theme.transitions.duration.short,
          }),
        }),
        sizeSmall: ({ theme }) => ({
          padding: theme.spacing(1, 2.5),
        }),
        sizeMedium: ({ theme }) => ({
          padding: theme.spacing(1.25, 2.5),
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main,
          },
        }),
        outlinedPrimary: ({ theme }) => ({
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main,
          },
        }),
        outlinedSecondary: ({ theme }) => ({
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.secondary.main,
          },
        }),
        outlinedError: ({ theme }) => ({
          borderColor: theme.palette.error.main,
          color: theme.palette.error.main,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.error.dark,
          },
        }),
        outlinedWarning: ({ theme }) => ({
          borderColor: theme.palette.warning.main,
          color: theme.palette.warning.dark,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.warning.dark,
          },
        }),
        outlinedSuccess: ({ theme }) => ({
          borderColor: theme.palette.success.main,
          color: theme.palette.success.dark,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.success.dark,
          },
        }),
        contained: ({ theme }) => ({
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        }),
        containedPrimary: ({ theme }) => ({
          '&:hover': {
            boxShadow: 'none',
          },
        }),
        text: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.spacing(2.5),
          transition: theme.transitions.create(['background-color'], {
            duration: theme.transitions.duration.short,
          }),
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
          backgroundImage: 'none',
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.14)',
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.h6.fontSize,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          padding: theme.spacing(2, 2.5),
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(2, 2.5),
          paddingTop: theme.spacing(2),
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(1.5, 2, 2),
          gap: theme.spacing(1),
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
          transition: theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.short,
          }),
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
          fontWeight: 600,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndProvider backend={HTML5Backend}>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<MapView />} />
              {/* Additional routes will be nested here */}
            </Route>
            <Route path="rbawplan" element={<OnCallPlanningView />} />
          </Routes>
        </Router>
      </DndProvider>
    </ThemeProvider>
  );
};

export default App;
