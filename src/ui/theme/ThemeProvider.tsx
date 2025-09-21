import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

const spacingUnit = 8;

const lightColors = {
  background: '#f5f5f7',
  surface: '#ffffff',
  border: 'rgba(18, 18, 20, 0.08)',
  muted: '#6b7280',
  primary: '#1f6feb',
  primaryMuted: '#dbeafe',
  text: '#0f172a',
  textMuted: '#475569',
  success: '#0ea5e9',
  warning: '#f59e0b',
};

const darkColors = {
  background: '#05070a',
  surface: '#11161c',
  border: 'rgba(255, 255, 255, 0.08)',
  muted: '#7c8698',
  primary: '#3b82f6',
  primaryMuted: '#1d2737',
  text: '#f9fafb',
  textMuted: '#94a3b8',
  success: '#22d3ee',
  warning: '#fbbf24',
};

export interface Theme {
  mode: 'light' | 'dark';
  colors: typeof lightColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  typography: {
    title: number;
    heading: number;
    body: number;
    small: number;
  };
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = useMemo<Theme>(() => {
    const mode = colorScheme === 'light' ? 'light' : 'dark';
    const colors = mode === 'light' ? lightColors : darkColors;
    return {
      mode,
      colors,
      spacing: {
        xs: spacingUnit * 0.5,
        sm: spacingUnit,
        md: spacingUnit * 2,
        lg: spacingUnit * 3,
        xl: spacingUnit * 4,
      },
      radius: {
        sm: 8,
        md: 12,
        lg: 18,
        full: 999,
      },
      typography: {
        title: 30,
        heading: 24,
        body: 16,
        small: 13,
      },
    };
  }, [colorScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
