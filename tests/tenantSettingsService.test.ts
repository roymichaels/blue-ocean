import TenantSettingsService from '../services/tenantSettings';
describe('TenantSettingsService remote', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    (TenantSettingsService as any).instance = undefined;
    process.env.EXPO_PUBLIC_SETTINGS_API_URL = 'https://api.example.com';
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
});
