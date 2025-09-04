import { isChatConfigured } from '@/services/chatConfig';
import { getAdmins } from '@/services/nearSettings';

jest.mock('@/services/nearSettings', () => ({
  getAdmins: jest.fn(),
}));

const mockedGetAdmins = getAdmins as jest.Mock;

describe('chat configuration', () => {
  it('returns false when no admins', async () => {
    mockedGetAdmins.mockResolvedValue([]);
    expect(await isChatConfigured()).toBe(false);
  });

  it('returns true when admins exist', async () => {
    mockedGetAdmins.mockResolvedValue(['addr_admin']);
    expect(await isChatConfigured()).toBe(true);
  });
});
