jest.mock('../services/tonAuth', () => ({
  getAddress: () => 'addr_admin',
  getTonPublicKey: () => 'pub_admin',
  openModal: jest.fn(),
  getTonConnect: () => ({
    sendTransaction: jest.fn().mockResolvedValue({}),
  }),
}));
jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
jest.mock('../services/tonSettings');

import SettingsAgent from '../agents/settings-agent';
import { __clear } from './tonKvMock';
import * as tonSettings from '../services/tonSettings';
const directSetAdmins = tonSettings.setAdmins;
const __store = (tonSettings as any).__store;

describe('SettingsAgent TON integration', () => {
  beforeEach(() => {
    __clear();
    (SettingsAgent as any).instance = undefined;
    (SettingsAgent as any).ADMIN_CACHE_TTL = 10; // short TTL for tests
    for (const k of Object.keys(__store)) delete __store[k];
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

  it('handles fee settings', async () => {
    const agent = SettingsAgent.getInstance();
    await agent.updateSettingValue('feeBps', '500');
    const fee = await agent.getSettingValue('feeBps');
    expect(fee).toBe('500');
  });

  it('refreshes admin list after TTL expiry', async () => {
    const agent = SettingsAgent.getInstance();
    await agent.setAdmins(['addr_admin']);
    const first = await agent.getAdmins();
    expect(first).toEqual(['addr_admin']);

    await directSetAdmins(['addr_other'], 'addr_admin');
    const stillCached = await agent.getAdmins();
    expect(stillCached).toEqual(['addr_admin']);

    await new Promise((r) => setTimeout(r, 20));
    const refreshed = await agent.getAdmins();
    expect(refreshed).toEqual(['addr_other']);
  });
});
