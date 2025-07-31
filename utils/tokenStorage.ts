import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
  }
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}
