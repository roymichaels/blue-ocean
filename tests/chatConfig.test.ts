import { insertConfig } from './testUtils';
import { isChatConfigured } from '../services/chatConfig';

describe('chat configuration', () => {
  it('returns false when config values are missing', async () => {
    await insertConfig({
      EXPO_PUBLIC_ADMIN_PUBLIC_KEY: '',
      TON_SETTINGS_ADDRESS: '',
      TON_USERS_ADDRESS: '',
    });
    expect(await isChatConfigured()).toBe(false);
  });

  it('returns true when config values are present', async () => {
    await insertConfig({
      EXPO_PUBLIC_ADMIN_PUBLIC_KEY: 'pub_admin',
      TON_SETTINGS_ADDRESS: 'addr_settings',
      TON_USERS_ADDRESS: 'addr_users',
    });
    expect(await isChatConfigured()).toBe(true);
  });
});
