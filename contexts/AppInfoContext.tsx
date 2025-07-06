import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/database';

interface AppInfoContextType {
  platformName: string;
  platformLogo: string;
  setPlatformName: (name: string) => Promise<void>;
  setPlatformLogo: (logo: string) => Promise<void>;
}

const AppInfoContext = createContext<AppInfoContextType>({
  platformName: '',
  platformLogo: '',
  setPlatformName: async () => {},
  setPlatformLogo: async () => {},
});

export const useAppInfo = () => useContext(AppInfoContext);

interface AppInfoProviderProps {
  children: ReactNode;
}

const NAME_STORAGE_KEY = 'app_platform_name';
const LOGO_STORAGE_KEY = 'app_platform_logo';

export function AppInfoProvider({ children }: AppInfoProviderProps) {
  const [platformName, setPlatformNameState] = useState('');
  const [platformLogo, setPlatformLogoState] = useState('');

  useEffect(() => {
    loadAppInfo();
  }, []);

  const loadAppInfo = async () => {
    try {
      const storedName = await AsyncStorage.getItem(NAME_STORAGE_KEY);
      const storedLogo = await AsyncStorage.getItem(LOGO_STORAGE_KEY);
      if (storedName) setPlatformNameState(storedName);
      if (storedLogo) setPlatformLogoState(storedLogo);

      const db = DatabaseService.getInstance();
      const name = await db.getSetting('platform_name');
      if (name) {
        setPlatformNameState(name);
        await AsyncStorage.setItem(NAME_STORAGE_KEY, name);
      }
      const logo = await db.getSetting('platform_logo');
      if (logo) {
        setPlatformLogoState(logo);
        await AsyncStorage.setItem(LOGO_STORAGE_KEY, logo);
      }
    } catch (error) {
      console.error('Error loading app info:', error);
    }
  };

  const setPlatformName = async (name: string) => {
    try {
      setPlatformNameState(name);
      await AsyncStorage.setItem(NAME_STORAGE_KEY, name);
      const db = DatabaseService.getInstance();
      await db.updateSetting('platform_name', name);
    } catch (error) {
      console.error('Error setting platform name:', error);
    }
  };

  const setPlatformLogo = async (logo: string) => {
    try {
      setPlatformLogoState(logo);
      await AsyncStorage.setItem(LOGO_STORAGE_KEY, logo);
      const db = DatabaseService.getInstance();
      await db.updateSetting('platform_logo', logo);
    } catch (error) {
      console.error('Error setting platform logo:', error);
    }
  };

  return (
    <AppInfoContext.Provider
      value={{
        platformName,
        platformLogo,
        setPlatformName,
        setPlatformLogo,
      }}
    >
      {children}
    </AppInfoContext.Provider>
  );
}
