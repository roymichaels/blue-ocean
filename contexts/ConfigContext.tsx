import React, { createContext, useContext, useEffect, useState } from 'react';
import appConfig, { initConfig } from '../utils/appConfig';

interface ConfigContextValue {
  config: Record<string, string>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: appConfig,
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

  return (
    <ConfigContext.Provider value={{ config: appConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}
