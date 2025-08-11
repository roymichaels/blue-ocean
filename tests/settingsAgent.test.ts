import SettingsAgent from '../agents/settings-agent';

jest.mock('../services/tonSettings', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const { getSetting, setSetting } = require('../services/tonSettings');

describe('SettingsAgent', () => {
  beforeEach(() => {
    (SettingsAgent as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('returns null when setting missing', async () => {
    const agent = SettingsAgent.getInstance();
    const val = await agent.getTenantSetting('foo', 'platform_name');
    expect(val).toBeNull();
    expect(getSetting).toHaveBeenCalled();
  });

  it('updates via TON service', async () => {
    const agent = SettingsAgent.getInstance();
    await agent.updateTenantSetting('foo', 'platform_name', 'Test');
    expect(setSetting).toHaveBeenCalledWith('foo:platform_name', 'Test');
  });
});
