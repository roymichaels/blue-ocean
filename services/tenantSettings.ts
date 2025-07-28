import { executeSql } from '../lib/sqlite';

export interface TenantSettingsRow {
  tenant_id: string;
  platform_name?: string | null;
  platform_logo?: string | null;
  theme_color?: string | null;
}

class TenantSettingsService {
  private static instance: TenantSettingsService;

  private constructor() {
    // Initialize table
    (async () => {
      try {
        await executeSql(
          `CREATE TABLE IF NOT EXISTS tenant_settings (
            tenant_id TEXT PRIMARY KEY NOT NULL,
            platform_name TEXT,
            platform_logo TEXT,
            theme_color TEXT
          )`
        );
      } catch (err) {
        console.error('Error creating tenant_settings table:', err);
      }
    })();
  }

  public static getInstance(): TenantSettingsService {
    if (!TenantSettingsService.instance) {
      TenantSettingsService.instance = new TenantSettingsService();
    }
    return TenantSettingsService.instance;
  }

  async getTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color'
  ): Promise<string | null> {
    try {
      const result = await executeSql(
        `SELECT ${key} FROM tenant_settings WHERE tenant_id = ? LIMIT 1`,
        [tenant]
      );
      const item = (result.rows as any)._array?.[0];
      return item ? item[key] || null : null;
    } catch (error) {
      console.error(`Error fetching tenant setting ${key}:`, error);
      return null;
    }
  }

  async updateTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
    value: string
  ): Promise<void> {
    try {
      const existing = await executeSql(
        'SELECT tenant_id FROM tenant_settings WHERE tenant_id = ? LIMIT 1',
        [tenant]
      );
      const existingRows = (existing.rows as any)._array;
      if (existingRows && existingRows.length > 0) {
        await executeSql(
          `UPDATE tenant_settings SET ${key} = ? WHERE tenant_id = ?`,
          [value, tenant]
        );
      } else {
        const cols = ['platform_name', 'platform_logo', 'theme_color'];
        const idx = cols.indexOf(key);
        const values: (string | null)[] = [null, null, null];
        if (idx >= 0) {
          values[idx] = value;
        }
        await executeSql(
          'INSERT INTO tenant_settings (tenant_id, platform_name, platform_logo, theme_color) VALUES (?,?,?,?)',
          [tenant, values[0], values[1], values[2]]
        );
      }
    } catch (error) {
      console.error(`Error updating tenant setting ${key}:`, error);
      throw error;
    }
  }
}

export default TenantSettingsService;
