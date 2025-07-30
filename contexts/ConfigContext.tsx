import React, { createContext, useContext, useState } from 'react';
import appConfig, { setConfig } from '../utils/appConfig';

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

  const setValue = (key: string, value: string) => {
    setConfig(key, value);
    // Trigger re-render for consumers
    forceUpdate({});
  };

  return (
    <ConfigContext.Provider value={{ config: appConfig, setValue }}>
      {children}
    </ConfigContext.Provider>
  );
}
