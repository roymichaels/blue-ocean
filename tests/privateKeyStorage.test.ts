import { savePrivateKey, getPrivateKey, removePrivateKey } from '../utils/privateKeyStorage';
import SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

describe('privateKeyStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses SecureStore on native platforms', async () => {
    (Platform as any).OS = 'ios';
    await savePrivateKey('priv');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('ed25519_private_key', 'priv');

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('priv');
    expect(await getPrivateKey()).toBe('priv');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('ed25519_private_key');

    await removePrivateKey();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('ed25519_private_key');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('uses AsyncStorage on web', async () => {
    (Platform as any).OS = 'web';
    await savePrivateKey('priv');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('ed25519_private_key', 'priv');

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('priv');
    expect(await getPrivateKey()).toBe('priv');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('ed25519_private_key');

    await removePrivateKey();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('ed25519_private_key');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
