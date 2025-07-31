import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CONFIG_KEY = 'app_config';

export async function loadConfig(): Promise<Record<string, string>> {
  try {
    const raw =
      Platform.OS === 'web'
        ? await AsyncStorage.getItem(CONFIG_KEY)
        : await SecureStore.getItemAsync(CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load config', err);
  }
  return {};
}

export async function saveConfig(config: Record<string, string>): Promise<void> {
  try {
    const data = JSON.stringify(config);
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(CONFIG_KEY, data);
    } else {
      await SecureStore.setItemAsync(CONFIG_KEY, data);
    }
  } catch (err) {
    console.warn('Failed to save config', err);
  }
}
