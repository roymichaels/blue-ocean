import { errorLog } from '@/utils/logger';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors as DarkColors } from '../constants/Colors';
import { darkTokens, lightTokens, Tokens } from '../constants/tokens';
import { useAppInfo } from './AppInfoContext';

const THEME_STORAGE_KEY = 'app_theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  colors: typeof DarkColors;
  tokens: Tokens;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkTokens.colors,
  tokens: darkTokens,
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [tokens, setTokens] = useState<Tokens>(darkTokens);
  const { themeColor } = useAppInfo();

  useEffect(() => {
    loadStoredTheme();
  }, []);

  useEffect(() => {
    applyTheme(theme, themeColor);
  }, [theme, themeColor]);

  const loadStoredTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        await setTheme(storedTheme as ThemeMode);
      }
    } catch (error) {
      errorLog('Error loading stored theme:', error);
    }
  };

  const applyTheme = (mode: ThemeMode, color: string) => {
    const base = mode === 'light' ? lightTokens : darkTokens;
    const merged = {
      ...base,
      colors: {
        ...base.colors,
        gold: color,
        interactive: {
          ...base.colors.interactive,
          primary: color,
          primaryHover: color,
        },
        tabBar: { ...base.colors.tabBar, active: color },
        border: { ...base.colors.border, focus: color },
      },
    };
    setTokens(merged);
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      applyTheme(newTheme, themeColor);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      errorLog('Error setting theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider 
      value={{
        theme,
        colors: tokens.colors,
        tokens,
        setTheme,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
