import * as SecureStore from 'expo-secure-store';
import Cookies from 'js-cookie';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    Cookies.set(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Cookies.get(TOKEN_KEY) || null;
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  if (Platform.OS === 'web') {
    Cookies.remove(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
