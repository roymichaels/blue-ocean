import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppMode } from '@/application/types';
import { resolveInitialAppMode } from '@/application/config/appConfig';

const STORAGE_KEY = 'blue-ocean/app-mode';

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage as Storage;
    }
  } catch (error) {
    console.warn('[app-mode] Local storage unavailable', error);
  }
  return null;
}

let memoryMode: AppMode | null = null;

function readPersistedMode(): AppMode | null {
  const storage = getLocalStorage();
  if (storage) {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored === 'mock' || stored === 'live') {
        return stored;
      }
    } catch (error) {
      console.warn('[app-mode] Failed to read stored mode', error);
    }
    return null;
  }
  return memoryMode;
}

function writePersistedMode(mode: AppMode) {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, mode);
      return;
    } catch (error) {
      console.warn('[app-mode] Failed to persist mode', error);
    }
  }
  memoryMode = mode;
}

interface AppModeContextValue {
  mode: AppMode;
  hydrated: boolean;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

function resolveInitialMode(): AppMode {
  return resolveInitialAppMode(process.env.EXPO_PUBLIC_APP_MODE);
}

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>(resolveInitialMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readPersistedMode();
    if (stored) {
      setMode(stored);
    }
    setHydrated(true);
  }, []);

  const setModeSafe = useCallback(
    (next: AppMode) => {
      setMode(next);
      writePersistedMode(next);
    },
    []
  );

  const toggleMode = useCallback(() => {
    setMode((current) => {
      const next: AppMode = current === 'mock' ? 'live' : 'mock';
      writePersistedMode(next);
      return next;
    });
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({ mode, hydrated, setMode: setModeSafe, toggleMode }),
    [mode, hydrated, setModeSafe, toggleMode]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
