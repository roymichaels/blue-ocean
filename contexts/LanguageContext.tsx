import { errorLog } from '@/utils/logger';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { configureRTL } from '../utils/rtl';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import enTranslations from '../translations/en.json';
import heTranslations from '../translations/he.json';

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
  t: (key: string, options?: Record<string, string | number> | string) =>
    typeof options === 'string' ? options : key,
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
      errorLog('Error loading stored language:', error);
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
      errorLog('Error setting language:', error);
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

  const t = (
    key: string,
    options?: Record<string, string | number> | string
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

  return (
    <LanguageContext.Provider 
      value={{ 
        currentLanguage, 
        setLanguage, 
        t, 
        isRTL 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
