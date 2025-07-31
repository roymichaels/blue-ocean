import { saveToken, getToken, removeToken } from '../utils/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage');

describe('tokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).window = {};
  });

  it('uses AsyncStorage on native platforms', async () => {
    (Platform as any).OS = 'ios';

    await saveToken('tok');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'tok');

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('tok');
    expect(await getToken()).toBe('tok');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_token');

    await removeToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('uses localStorage on web', async () => {
    (Platform as any).OS = 'web';
    const storage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    };
    (global as any).window = { localStorage: storage };

    await saveToken('tok');
    expect(storage.setItem).toHaveBeenCalledWith('auth_token', 'tok');

    storage.getItem.mockReturnValue('tok');
    expect(await getToken()).toBe('tok');
    expect(storage.getItem).toHaveBeenCalledWith('auth_token');

    await removeToken();
    expect(storage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
