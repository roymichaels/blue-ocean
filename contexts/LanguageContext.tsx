import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import enTranslations from '../translations/en.json';
import heTranslations from '../translations/he.json';

type Language = 'en' | 'he';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string, options?: Record<string, string> | string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'he',
  setLanguage: async () => {},
  t: (key: string, options?: Record<string, string> | string) =>
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

  const loadStoredLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'he')) {
        await setLanguage(storedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading stored language:', error);
    }
  };

  const setLanguage = async (language: Language) => {
    try {
      setCurrentLanguage(language);
      
      // Update translations
      if (language === 'en') {
        setTranslations(enTranslations);
        setIsRTL(false);
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      } else {
        setTranslations(heTranslations);
        setIsRTL(true);
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      }

      // Store language preference
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const t = (
    key: string,
    options?: Record<string, string> | string
  ): string => {
    const keys = key.split('.');
    let value: any = translations;
    let params: Record<string, string> | undefined;
    let fallback: string | undefined;

    if (typeof options === 'string') {
      fallback = options;
    } else if (options) {
      params = options;
    }

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }

    if (typeof value === 'string') {
      if (params) {
        return value.replace(/\{(.*?)\}/g, (_, p) => params?.[p] ?? '');
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