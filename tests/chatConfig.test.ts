import { insertConfig } from './testUtils';
import { isChatConfigured } from '../services/chatConfig';

describe('chat configuration', () => {
  it('returns false when config values are missing', async () => {
    await insertConfig({
      EXPO_PUBLIC_ADMIN_USERNAME: '',
      EXPO_PUBLIC_CHAT_SECRET: ''
    });
    expect(await isChatConfigured()).toBe(false);
  });

  it('returns true when config values are present', async () => {
    await insertConfig({
      EXPO_PUBLIC_ADMIN_USERNAME: 'admin',
      EXPO_PUBLIC_CHAT_SECRET: 'secret'
    });
    expect(await isChatConfigured()).toBe(true);
  });
});
