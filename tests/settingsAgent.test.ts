/// <reference types="node" />
import SettingsAgent from '../agents/settings-agent';
import { store } from '../lib/memoryStore';

jest.mock('../lib/waku/sendWakuSettingsUpdate', () => ({
  sendWakuSettingsUpdate: jest.fn(),
}));

describe('SettingsAgent', () => {
  beforeEach(() => {
    (SettingsAgent as any).instance = undefined;
    store.tenantSettings = {} as any;
    jest.clearAllMocks();
  });

  it('returns null when setting missing', async () => {
    const agent = SettingsAgent.getInstance();
    const val = await agent.getTenantSetting('foo', 'platform_name');
    expect(val).toBeNull();
  });

  it('updates local store and broadcasts', async () => {
    const { sendWakuSettingsUpdate } = require('../lib/waku/sendWakuSettingsUpdate');
    const agent = SettingsAgent.getInstance();
    await agent.updateTenantSetting('foo', 'platform_name', 'Test');
    expect(store.tenantSettings.foo.platform_name).toBe('Test');
    expect(sendWakuSettingsUpdate).toHaveBeenCalled();
  });
});
