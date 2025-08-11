import SettingsAgent from '../agents/settings-agent';

jest.mock('../services/tonAuth', () => ({
  getAddress: () => 'addr_admin',
  getTonPublicKey: () => 'pub_admin',
  openModal: jest.fn(),
}));

jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
import { __clear } from './tonKvMock';

describe('SettingsAgent TON integration', () => {
  beforeEach(() => {
    __clear();
    (SettingsAgent as any).instance = undefined;
  });

  it('returns null when setting missing', async () => {
    const agent = SettingsAgent.getInstance();
    const val = await agent.getTenantSetting('foo', 'platform_name');
    expect(val).toBeNull();
  });

  it('updates and retrieves setting via TON service', async () => {
    const agent = SettingsAgent.getInstance();
    await agent.updateTenantSetting('foo', 'platform_name', 'Test');
    const val = await agent.getTenantSetting('foo', 'platform_name');
    expect(val).toBe('Test');
  });
});
