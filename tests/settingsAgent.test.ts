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
    const val = await agent.getSettingValue('appName');
    expect(val).toBeNull();
  });

  it('updates and retrieves setting via TON service', async () => {
    const agent = SettingsAgent.getInstance();
    await agent.updateSettingValue('appName', 'Test');
    const val = await agent.getSettingValue('appName');
    expect(val).toBe('Test');
  });
});
