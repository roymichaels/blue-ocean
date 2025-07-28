import TenantSettingsService from '../services/tenantSettings';
import { executeSql } from '../lib/sqlite';

jest.mock('../lib/sqlite', () => ({
  executeSql: jest.fn(),
}));

describe('TenantSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (TenantSettingsService as any).instance = undefined;
  });

  it('inserts a new row when none exists', async () => {
    (executeSql as jest.Mock)
      .mockResolvedValueOnce({ rows: { _array: [] } })
      .mockResolvedValueOnce({ rows: { _array: [] } })
      .mockResolvedValueOnce({ rows: { _array: [] } });

    const service = TenantSettingsService.getInstance();
    await service.updateTenantSetting('t1', 'platform_name', 'name');

    expect(executeSql).toHaveBeenNthCalledWith(
      2,
      'SELECT tenant_id FROM tenant_settings WHERE tenant_id = ? LIMIT 1',
      ['t1']
    );
    expect(executeSql).toHaveBeenNthCalledWith(
      3,
      'INSERT INTO tenant_settings (tenant_id, platform_name, platform_logo, theme_color) VALUES (?,?,?,?)',
      ['t1', 'name', null, null]
    );
  });

  it('updates an existing row', async () => {
    (executeSql as jest.Mock)
      .mockResolvedValueOnce({ rows: { _array: [] } })
      .mockResolvedValueOnce({ rows: { _array: [{ tenant_id: 't1' }] } })
      .mockResolvedValueOnce({ rows: { _array: [] } });

    const service = TenantSettingsService.getInstance();
    await service.updateTenantSetting('t1', 'theme_color', 'blue');

    expect(executeSql).toHaveBeenNthCalledWith(
      2,
      'SELECT tenant_id FROM tenant_settings WHERE tenant_id = ? LIMIT 1',
      ['t1']
    );
    expect(executeSql).toHaveBeenNthCalledWith(
      3,
      'UPDATE tenant_settings SET theme_color = ? WHERE tenant_id = ?',
      ['blue', 't1']
    );
  });

  it('fetches stored value', async () => {
    (executeSql as jest.Mock)
      .mockResolvedValueOnce({ rows: { _array: [] } })
      .mockResolvedValueOnce({ rows: { _array: [{ platform_logo: 'logo' }] } });

    const service = TenantSettingsService.getInstance();
    const result = await service.getTenantSetting('t1', 'platform_logo');

    expect(executeSql).toHaveBeenNthCalledWith(
      2,
      'SELECT platform_logo FROM tenant_settings WHERE tenant_id = ? LIMIT 1',
      ['t1']
    );
    expect(result).toBe('logo');
  });
});
