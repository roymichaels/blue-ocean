
import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import DatabaseService from '../services/database';
import MediaService from '../services/media';

const TENANT = process.env.EXPO_PUBLIC_TENANT || 'default';

interface AppInfoContextType {
  platformName: string;
  platformLogo: string;
  themeColor: string;
  setPlatformName: (name: string) => Promise<void>;
  setPlatformLogo: (logo: string) => Promise<void>;
  setThemeColor: (color: string) => Promise<void>;
}

const AppInfoContext = createContext<AppInfoContextType>({
  platformName: '',
  platformLogo: '',
  themeColor: '#B99C5A',
  setPlatformName: async () => {},
  setPlatformLogo: async () => {},
  setThemeColor: async () => {},
});

export const useAppInfo = () => useContext(AppInfoContext);

interface AppInfoProviderProps {
  children: ReactNode;
}


// Store branding separately for each tenant to avoid cross-tenant mixing
const NAME_KEY = `app_platform_name_${TENANT}`;
const LOGO_KEY = `app_platform_logo_${TENANT}`;
const COLOR_KEY = `app_theme_color_${TENANT}`;

export function AppInfoProvider({ children }: AppInfoProviderProps) {
  const [platformName, setPlatformNameState] = useState('');
  const [platformLogo, setPlatformLogoState] = useState('');
  const [themeColor, setThemeColorState] = useState('#B99C5A');
  const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const storedName = await AsyncStorage.getItem(NAME_KEY);
      const storedLogo = await AsyncStorage.getItem(LOGO_KEY);
      const storedColor = await AsyncStorage.getItem(COLOR_KEY);
      if (storedName) setPlatformNameState(storedName);
      if (storedLogo) setPlatformLogoState(storedLogo);
      if (storedColor) setThemeColorState(storedColor);

      const db = DatabaseService.getInstance();
      const dbName = await db.getTenantSetting(TENANT, 'platform_name');
      const dbLogo = await db.getTenantSetting(TENANT, 'platform_logo');
      const dbColor = await db.getTenantSetting(TENANT, 'theme_color');
      if (dbName) {
        setPlatformNameState(dbName);
        await AsyncStorage.setItem(NAME_KEY, dbName);
      }
      if (dbLogo) {
        setPlatformLogoState(dbLogo);
        await AsyncStorage.setItem(LOGO_KEY, dbLogo);
      }
      if (dbColor) {
        setThemeColorState(dbColor);
        await AsyncStorage.setItem(COLOR_KEY, dbColor);
      }
    } catch (e) {
      console.error('Error loading app info:', e);
    }
  };

  const scheduleLoadInfo = () => {
    if (reloadTimeout.current) {
      clearTimeout(reloadTimeout.current);
    }
    reloadTimeout.current = setTimeout(() => {
      loadInfo();
    }, 300);
  };

  const setPlatformName = async (name: string) => {
    setPlatformNameState(name);
    await AsyncStorage.setItem(NAME_KEY, name);
    const db = DatabaseService.getInstance();
    try {
      await db.updateTenantSetting(TENANT, 'platform_name', name);
      scheduleLoadInfo();
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת שם הפלטפורמה נכשלה');
      console.error('Error setting platform name:', e);
      throw e;
    }
  };

  const setPlatformLogo = async (logo: string) => {
    try {
      let finalLogo = logo;
      if (logo && !logo.startsWith('http')) {
        const mediaSvc = MediaService.getInstance();
        finalLogo = await mediaSvc.uploadMedia(logo, 'tenant_logo');
      }

      setPlatformLogoState(finalLogo);
      await AsyncStorage.setItem(LOGO_KEY, finalLogo);
      const db = DatabaseService.getInstance();
      await db.updateTenantSetting(TENANT, 'platform_logo', finalLogo);
      scheduleLoadInfo();
    } catch (e) {
      console.error('Error setting platform logo:', e);
      throw e;
    }
  };

  const setThemeColor = async (color: string) => {
    try {
      setThemeColorState(color);
      await AsyncStorage.setItem(COLOR_KEY, color);
      const db = DatabaseService.getInstance();
      await db.updateTenantSetting(TENANT, 'theme_color', color);
      scheduleLoadInfo();
    } catch (e) {
      console.error('Error setting theme color:', e);
      throw e;
    }
  };

  return (
    <AppInfoContext.Provider
      value={{
        platformName,
        platformLogo,
        themeColor,
        setPlatformName,
        setPlatformLogo,
        setThemeColor,
      }}
    >
      {children}
    </AppInfoContext.Provider>
  );
}
