/**
 * Combined MUI and Tailwind Theme Configuration
 * Ensures Tailwind classes take precedence over MUI styles
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { ThemeMode } from '../types';

// ============================================
// Color Palette Configuration
// ============================================

const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#6366f1', // Indigo-500
    light: '#818cf8', // Indigo-400
    dark: '#4f46e5', // Indigo-600
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#ec4899', // Pink-500
    light: '#f472b6', // Pink-400
    dark: '#db2777', // Pink-600
    contrastText: '#ffffff',
  },
  background: {
    default: '#f9fafb', // Gray-50
    paper: '#ffffff',
  },
  text: {
    primary: '#111827', // Gray-900
    secondary: '#6b7280', // Gray-500
  },
  divider: '#e5e7eb', // Gray-200
};

const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#818cf8', // Indigo-400
    light: '#a5b4fc', // Indigo-300
    dark: '#6366f1', // Indigo-500
    contrastText: '#000000',
  },
  secondary: {
    main: '#f472b6', // Pink-400
    light: '#f9a8d4', // Pink-300
    dark: '#ec4899', // Pink-500
    contrastText: '#000000',
  },
  background: {
    default: '#0f172a', // Slate-900
    paper: '#1e293b', // Slate-800
  },
  text: {
    primary: '#f1f5f9', // Slate-100
    secondary: '#94a3b8', // Slate-400
  },
  divider: '#334155', // Slate-700
};

// ============================================
// Shared Theme Options
// ============================================

const commonThemeOptions: Partial<ThemeOptions> = {
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
  },
};

// ============================================
// Theme Factory Function
// ============================================

export const createAppTheme = (mode: ThemeMode) => {
  return createTheme({
    ...commonThemeOptions,
    palette: mode === 'light' ? lightPalette : darkPalette,
  });
};

// ============================================
// Tailwind Dark Mode Utility
// ============================================

export const syncTailwindDarkMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};
