
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/database';

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


const NAME_KEY = 'app_platform_name';
const LOGO_KEY = 'app_platform_logo';
const COLOR_KEY = 'app_theme_color';

export function AppInfoProvider({ children }: AppInfoProviderProps) {
  const [platformName, setPlatformNameState] = useState('');
  const [platformLogo, setPlatformLogoState] = useState('');
  const [themeColor, setThemeColorState] = useState('#B99C5A');

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
      const dbName = await db.getSetting('platform_name');
      const dbLogo = await db.getSetting('platform_logo');
      const dbColor = await db.getSetting('theme_color');
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

  const setPlatformName = async (name: string) => {
    try {
      setPlatformNameState(name);
      await AsyncStorage.setItem(NAME_KEY, name);
      const db = DatabaseService.getInstance();
      await db.updateSetting('platform_name', name);
    } catch (e) {
      console.error('Error setting platform name:', e);
    }
  };

  const setPlatformLogo = async (logo: string) => {
    try {
      setPlatformLogoState(logo);
      await AsyncStorage.setItem(LOGO_KEY, logo);
      const db = DatabaseService.getInstance();
      await db.updateSetting('platform_logo', logo);
    } catch (e) {
      console.error('Error setting platform logo:', e);
    }
  };

  const setThemeColor = async (color: string) => {
    try {
      setThemeColorState(color);
      await AsyncStorage.setItem(COLOR_KEY, color);
      const db = DatabaseService.getInstance();
      await db.updateSetting('theme_color', color);
    } catch (e) {
      console.error('Error setting theme color:', e);
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
