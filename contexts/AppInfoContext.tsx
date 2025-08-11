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
import { fetchSettings } from '../services/tonSettings';

interface AppInfoContextType {
  tenantId: string;
  appName: string;
  logoCid: string;
  themeColor: string;
  fiatKey?: string;
  setAppName: (name: string) => Promise<void>;
  setLogoCid: (logo: string) => Promise<void>;
  setThemeColor: (color: string) => Promise<void>;
}

const AppInfoContext = createContext<AppInfoContextType>({
  tenantId: 'default',
  appName: '',
  logoCid: '',
  themeColor: '#B99C5A',
  fiatKey: undefined,
  setAppName: async () => {},
  setLogoCid: async () => {},
  setThemeColor: async () => {},
});

export const useAppInfo = () => useContext(AppInfoContext);

interface AppInfoProviderProps {
  children: ReactNode;
}

// Store branding separately for each tenant to avoid cross-tenant mixing

export function AppInfoProvider({ children }: AppInfoProviderProps) {
  const [tenantId, setTenantId] = useState<string>('default');
  const [appName, setAppNameState] = useState('');
  const [logoCid, setLogoCidState] = useState('');
  const [themeColor, setThemeColorState] = useState('#B99C5A');
  const [fiatKey, setFiatKey] = useState<string | undefined>(undefined);
  const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInfo = async () => {
    const TENANT_KEY = `app_tenant_id`;
    const storedTenant = await AsyncStorage.getItem(TENANT_KEY);
    const currentTenant = storedTenant || tenantId;
    if (storedTenant) setTenantId(storedTenant);
    const NAME_KEY = `app_name_${currentTenant}`;
    const LOGO_KEY = `app_logo_${currentTenant}`;
    const COLOR_KEY = `app_theme_primary_${currentTenant}`;
    const FIAT_KEY = `app_fiat_key_${currentTenant}`;
    try {
      const storedName = await AsyncStorage.getItem(NAME_KEY);
      const storedLogo = await AsyncStorage.getItem(LOGO_KEY);
      const storedColor = await AsyncStorage.getItem(COLOR_KEY);
      const storedFiat = await AsyncStorage.getItem(FIAT_KEY);
      if (storedName) setAppNameState(storedName);
      if (storedLogo) setLogoCidState(storedLogo);
      if (storedColor) setThemeColorState(storedColor);
      if (storedFiat) setFiatKey(storedFiat || undefined);

      try {
        const remote = await fetchSettings();
        setTenantId(remote.tenantId);
        await AsyncStorage.setItem(TENANT_KEY, remote.tenantId);
        if (remote.appName) {
          setAppNameState(remote.appName);
          await AsyncStorage.setItem(`app_name_${remote.tenantId}`, remote.appName);
        }
        if (remote.brand.logoCid) {
          setLogoCidState(remote.brand.logoCid);
          await AsyncStorage.setItem(
            `app_logo_${remote.tenantId}`,
            remote.brand.logoCid,
          );
        }
        if (remote.theme.primary) {
          setThemeColorState(remote.theme.primary);
          await AsyncStorage.setItem(
            `app_theme_primary_${remote.tenantId}`,
            remote.theme.primary,
          );
        }
        if (remote.fiatKey) {
          setFiatKey(remote.fiatKey);
          await AsyncStorage.setItem(
            `app_fiat_key_${remote.tenantId}`,
            remote.fiatKey,
          );
        }
      } catch (err) {
        Alert.alert('שגיאה', 'טעינת הגדרות מהשרת נכשלה');
        console.error('Failed fetching branding from server:', err);
      }
    } catch (e) {
      console.error('Error loading app info:', e);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const scheduleLoadInfo = () => {
    if (reloadTimeout.current) {
      clearTimeout(reloadTimeout.current);
    }
    reloadTimeout.current = setTimeout(() => {
      loadInfo();
    }, 300);
  };

  const setAppName = async (name: string) => {
    const NAME_KEY = `app_name_${tenantId}`;
    setAppNameState(name);
    await AsyncStorage.setItem(NAME_KEY, name);
    const tenantSvc = SettingsAgent.getInstance();
    try {
      await tenantSvc.whenReady();
    } catch (e) {
      Alert.alert('שגיאה', 'התחברות לשירות ההגדרת נכשלה');
      console.error('Failed initializing SettingsAgent:', e);
      throw e;
    }
    try {
      await tenantSvc.updateSettingValue('appName', name);
      scheduleLoadInfo();
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת שם הפלטפורמה נכשלה');
      console.error('Error setting platform name:', e);
      throw e;
    }
  };

  const setLogoCid = async (logo: string) => {
    try {
      const LOGO_KEY = `app_logo_${tenantId}`;
      setLogoCidState(logo);
      await AsyncStorage.setItem(LOGO_KEY, logo);
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת לוגו נכשלה');
      console.error('Error setting platform logo:', e);
      throw e;
    }
    const tenantSvc = SettingsAgent.getInstance();
    try {
      await tenantSvc.whenReady();
    } catch (e) {
      Alert.alert('שגיאה', 'התחברות לשירות ההגדרות נכשלה');
      console.error('Failed initializing SettingsAgent:', e);
      throw e;
    }
    try {
      await tenantSvc.updateSettingValue('brand.logoCid', logo);
      scheduleLoadInfo();
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת לוגו נכשלה');
      console.error('Error setting platform logo:', e);
      throw e;
    }
  };

  const setThemeColor = async (color: string) => {
    try {
      const COLOR_KEY = `app_theme_primary_${tenantId}`;
      setThemeColorState(color);
      await AsyncStorage.setItem(COLOR_KEY, color);
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת צבע ערכת הנושא נכשלה');
      console.error('Error setting theme color:', e);
      throw e;
    }
    const tenantSvc = SettingsAgent.getInstance();
    try {
      await tenantSvc.whenReady();
    } catch (e) {
      Alert.alert('שגיאה', 'התחברות לשירות ההגדרות נכשלה');
      console.error('Failed initializing SettingsAgent:', e);
      throw e;
    }
    try {
      await tenantSvc.updateSettingValue('theme.primary', color);
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
        tenantId,
        appName,
        logoCid,
        themeColor,
        fiatKey,
        setAppName,
        setLogoCid,
        setThemeColor,
      }}
    >
      {children}
    </AppInfoContext.Provider>
  );
}
