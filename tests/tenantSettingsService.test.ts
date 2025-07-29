/// <reference types="node" />
import TenantSettingsService from '../services/tenantSettings';
import { insertConfig } from './testUtils';
describe('TenantSettingsService remote', () => {
  beforeEach(async () => {
    (globalThis as any).fetch = jest.fn();
    (TenantSettingsService as any).instance = undefined;
    await insertConfig({
      EXPO_PUBLIC_SETTINGS_API_URL: 'https://api.example.com',
    });
  });

  it('fetches tenant setting', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ platform_name: 'Test' }),
    });
    const svc = TenantSettingsService.getInstance();
    const val = await svc.getTenantSetting('foo', 'platform_name');
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/tenant_settings/foo');
    expect(val).toBe('Test');
  });

  it('throws on fetch error', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('network'));
    const svc = TenantSettingsService.getInstance();
    await expect(svc.getTenantSetting('foo', 'platform_name')).rejects.toThrow('network');
  });

  it('returns null when API url is empty', async () => {
    await insertConfig({ EXPO_PUBLIC_SETTINGS_API_URL: '' });
    const svc = TenantSettingsService.getInstance();
    const val = await svc.getTenantSetting('foo', 'platform_name');
    expect(val).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips update when API url is empty', async () => {
    await insertConfig({ EXPO_PUBLIC_SETTINGS_API_URL: '' });
    const svc = TenantSettingsService.getInstance();
    await svc.updateTenantSetting('foo', 'platform_name', 'bar');
    expect(fetch).not.toHaveBeenCalled();
  });
});
