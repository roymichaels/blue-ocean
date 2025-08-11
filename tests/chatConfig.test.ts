import { insertConfig } from './testUtils';
import { isChatConfigured } from '../services/chatConfig';
import { getAdmins } from '../services/tonSettings';

jest.mock('../services/tonSettings', () => ({
  getAdmins: jest.fn(),
}));

const mockedGetAdmins = getAdmins as jest.Mock;

describe('chat configuration', () => {
  it('returns false when config values are missing', async () => {
    mockedGetAdmins.mockResolvedValue([]);
    await insertConfig({
      TON_SETTINGS_ADDRESS: '',
      TON_USERS_ADDRESS: '',
    });
    expect(await isChatConfigured()).toBe(false);
  });

  it('returns true when config values are present', async () => {
    mockedGetAdmins.mockResolvedValue(['addr_admin']);
    await insertConfig({
      TON_SETTINGS_ADDRESS: 'addr_settings',
      TON_USERS_ADDRESS: 'addr_users',
    });
    expect(await isChatConfigured()).toBe(true);
  });
});
