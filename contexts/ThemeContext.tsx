import { errorLog } from '@/utils/logger';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens as darkTokens, lightTokens, Tokens } from '@/constants/tokens';
import { useAppInfo } from './AppInfoContext';

const THEME_STORAGE_KEY = 'app_theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  colors: Tokens['colors'];
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
  const [currentTokens, setCurrentTokens] = useState<Tokens>(darkTokens);
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
    setCurrentTokens(prev => ({
      ...prev,
      ...base,
      colors: {
        ...prev.colors,
        ...base.colors,
        gold: color,
        interactive: {
          ...base.colors.interactive,
          ...prev.colors.interactive,
          primary: color,
          primaryHover: color,
        },
        tabBar: { ...base.colors.tabBar, ...prev.colors.tabBar, active: color },
        border: { ...base.colors.border, ...prev.colors.border, focus: color },
      },
    }));
  };

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      applyTheme(newTheme, themeColor);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      errorLog('Error setting theme:', error);
    }
  }, [themeColor]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  }, [theme, setTheme]);
  const value = useMemo(
    () => ({
      theme,
      colors: currentTokens.colors,
      tokens: currentTokens,
      setTheme,
      toggleTheme,
    }),
    [theme, currentTokens, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
