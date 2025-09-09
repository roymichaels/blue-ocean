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
import { tokens as darkTokens, lightTokens, Tokens } from '@/shared/ui/tokens';
import { useAppInfo } from '@/contexts/AppInfoContext';
import { configureRTL } from '@/utils/rtl';
import enTranslations from '@/translations/en.json';
import heTranslations from '@/translations/he.json';
import { setT, t as defaultT } from '@/i18n';

// -----------------
// Theme context
// -----------------

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

export const useTheme = () => {
  const { theme, tokens, colors, setTheme, toggleTheme } = useContext(ThemeContext);

  const getColor = useCallback(
    (path: string): any => {
      return path.split('.').reduce((acc: any, key) => (acc ? acc[key] : undefined), colors);
    },
    [colors],
  );

  const getTokens = useCallback(() => tokens, [tokens]);

  return useMemo(
    () => ({ theme, colors, getTokens, getColor, setTheme, toggleTheme }),
    [theme, colors, getTokens, getColor, setTheme, toggleTheme],
  );
};

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
      errorLog(error);
    }
  };

  const applyTheme = (mode: ThemeMode, color: string) => {
    const base = mode === 'light' ? lightTokens : darkTokens;
    setCurrentTokens(prev => {
      const nextTokens = {
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
      };

      if (nextTokens.colors.text.primary === nextTokens.colors.canvas) {
        nextTokens.colors.text = {
          ...nextTokens.colors.text,
          primary: '#1A1A1A',
        };
      }

      return nextTokens;
    });
  };

  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      try {
        setThemeState(newTheme);
        applyTheme(newTheme, themeColor);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (error) {
        errorLog(error);
      }
    },
    [themeColor],
  );

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

// -----------------
// Language context
// -----------------

type Language = 'en' | 'he';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string, options?: Record<string, string | number> | string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'he',
  setLanguage: async () => {},
  t: defaultT,
  isRTL: true,
});

export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

const LANGUAGE_STORAGE_KEY = 'app_language';

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('he');
  const [translations, setTranslations] = useState(heTranslations);
  const [isRTL, setIsRTL] = useState(true);

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  useEffect(() => {
    configureRTL(isRTL);
  }, [isRTL]);

  const loadStoredLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'he')) {
        await setLanguage(storedLanguage as Language);
      }
    } catch (error) {
      errorLog(error);
      await setLanguage('en');
    }
  };

  const setLanguage = async (language: Language) => {
    try {
      setCurrentLanguage(language);

      if (language === 'en') {
        setTranslations(enTranslations);
        setIsRTL(false);
      } else {
        setTranslations(heTranslations);
        setIsRTL(true);
      }
      configureRTL(language === 'he');

      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      errorLog(error);
      setTranslations(enTranslations);
      setIsRTL(false);
      setCurrentLanguage('en');
      configureRTL(false);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    }
  };

  const getValue = (obj: any, keys: string[]) => {
    let val = obj;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return undefined;
      }
    }
    return val;
  };

  const translate = (
    key: string,
    options?: Record<string, string | number> | string,
  ): string => {
    const keys = key.split('.');
    let params: Record<string, string | number> | undefined;
    let fallback: string | undefined;

    if (typeof options === 'string') {
      fallback = options;
    } else if (options) {
      params = options;
    }

    let value = getValue(translations, keys);
    if (value === undefined) {
      value = getValue(enTranslations, keys);
    }

    if (typeof value === 'string') {
      if (params) {
        return value.replace(/\{(.*?)\}/g, (_, p) => String(params?.[p] ?? ''));
      }
      return value;
    }

    return fallback || key;
  };

  setT(translate);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t: translate,
        isRTL,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

