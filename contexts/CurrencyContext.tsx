import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/database';

interface CurrencyContextType {
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currencySymbol: '₪',
  setCurrencySymbol: async () => {},
});

export const useCurrency = () => useContext(CurrencyContext);

interface CurrencyProviderProps {
  children: ReactNode;
}

const CURRENCY_STORAGE_KEY = 'app_currency_symbol';

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currencySymbol, setCurrencySymbolState] = useState<string>('₪');

  useEffect(() => {
    loadCurrencySymbol();
  }, []);

  const loadCurrencySymbol = async () => {
    try {
      // First try to load from AsyncStorage for faster initial load
      const storedSymbol = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      
      if (storedSymbol) {
        setCurrencySymbolState(storedSymbol);
      }
      
      // Then try to load from database for the latest value
      const db = DatabaseService.getInstance();
      const dbSymbol = await db.getSetting('currency_symbol');
      
      if (dbSymbol) {
        setCurrencySymbolState(dbSymbol);
        // Update AsyncStorage with the latest value
        await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, dbSymbol);
      }
    } catch (error) {
      console.error('Error loading currency symbol:', error);
    }
  };

  const setCurrencySymbol = async (symbol: string) => {
    try {
      setCurrencySymbolState(symbol);
      
      // Save to AsyncStorage for faster loading next time
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, symbol);
      
      // Save to database for persistence across devices
      const db = DatabaseService.getInstance();
      await db.updateSetting('currency_symbol', symbol);
    } catch (error) {
      console.error('Error setting currency symbol:', error);
    }
  };

  return (
    <CurrencyContext.Provider 
      value={{ 
        currencySymbol, 
        setCurrencySymbol
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
