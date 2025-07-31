import React, { createContext, useContext, useEffect, useState } from 'react';
import appConfig, { setConfig, initConfig, persist } from '../utils/appConfig';

interface ConfigContextValue {
  config: Record<string, string>;
  setValue: (key: string, value: string) => void;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: appConfig,
  setValue: () => {},
});

export const useConfig = () => useContext(ConfigContext);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    (async () => {
      await initConfig();
      forceUpdate({});
    })();
  }, []);

  const setValue = (key: string, value: string) => {
    setConfig(key, value);
    persist().catch(() => {});
    forceUpdate({});
  };

  return (
    <ConfigContext.Provider value={{ config: appConfig, setValue }}>
      {children}
    </ConfigContext.Provider>
  );
}
