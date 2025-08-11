import React, { createContext, useContext } from 'react';
import appConfig from '../utils/appConfig';

interface ConfigContextValue {
  config: Record<string, string>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: appConfig,
});

export const useConfig = () => useContext(ConfigContext);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigContext.Provider value={{ config: appConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}
