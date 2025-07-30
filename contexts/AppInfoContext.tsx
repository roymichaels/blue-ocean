import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import SettingsAgent from '../agents/settings-agent';
import MediaService from '../services/media';
import config from '../utils/appConfig';

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

export function AppInfoProvider({ children }: AppInfoProviderProps) {
  const [tenant, setTenant] = useState<string>('default');
  const [platformName, setPlatformNameState] = useState('');
  const [platformLogo, setPlatformLogoState] = useState('');
  const [themeColor, setThemeColorState] = useState('#B99C5A');
  const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = config.EXPO_PUBLIC_TENANT;
    setTenant(t || 'default');
    loadInfo();
  }, []);

  const loadInfo = async () => {
    const NAME_KEY = `app_platform_name_${tenant}`;
    const LOGO_KEY = `app_platform_logo_${tenant}`;
    const COLOR_KEY = `app_theme_color_${tenant}`;
    try {
      const storedName = await AsyncStorage.getItem(NAME_KEY);
      const storedLogo = await AsyncStorage.getItem(LOGO_KEY);
      const storedColor = await AsyncStorage.getItem(COLOR_KEY);
      if (storedName) setPlatformNameState(storedName);
      if (storedLogo) setPlatformLogoState(storedLogo);
      if (storedColor) setThemeColorState(storedColor);

      const tenantSvc = SettingsAgent.getInstance();
      try {
        const t = tenant;
        const dbName = await tenantSvc.getTenantSetting(t, 'platform_name');
        const dbLogo = await tenantSvc.getTenantSetting(t, 'platform_logo');
        const dbColor = await tenantSvc.getTenantSetting(t, 'theme_color');
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
      } catch (err) {
        console.error('Failed fetching branding from server:', err);
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
    const NAME_KEY = `app_platform_name_${tenant}`;
    setPlatformNameState(name);
    await AsyncStorage.setItem(NAME_KEY, name);
    const tenantSvc = SettingsAgent.getInstance();
    try {
      await tenantSvc.updateTenantSetting(tenant, 'platform_name', name);
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

      const LOGO_KEY = `app_platform_logo_${tenant}`;
      setPlatformLogoState(finalLogo);
      await AsyncStorage.setItem(LOGO_KEY, finalLogo);
      const tenantSvc = SettingsAgent.getInstance();
      await tenantSvc.updateTenantSetting(tenant, 'platform_logo', finalLogo);
      scheduleLoadInfo();
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת לוגו נכשלה');
      console.error('Error setting platform logo:', e);
      throw e;
    }
  };

  const setThemeColor = async (color: string) => {
    try {
      const COLOR_KEY = `app_theme_color_${tenant}`;
      setThemeColorState(color);
      await AsyncStorage.setItem(COLOR_KEY, color);
      const tenantSvc = SettingsAgent.getInstance();
      await tenantSvc.updateTenantSetting(tenant, 'theme_color', color);
      scheduleLoadInfo();
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת צבע ערכת הנושא נכשלה');
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
