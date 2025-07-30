import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PRIVATE_KEY_KEY = 'ed25519_private_key';

export async function savePrivateKey(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(PRIVATE_KEY_KEY, key);
  } else {
    await SecureStore.setItemAsync(PRIVATE_KEY_KEY, key);
  }
}

export async function getPrivateKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(PRIVATE_KEY_KEY);
  }
  return await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
}

export async function removePrivateKey(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(PRIVATE_KEY_KEY);
  } else {
    await SecureStore.deleteItemAsync(PRIVATE_KEY_KEY);
  }
}
