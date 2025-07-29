export interface TenantSettingsRow {
  tenant_id: string;
  platform_name?: string | null;
  platform_logo?: string | null;
  theme_color?: string | null;
}

function apiBase() {
  return process.env.EXPO_PUBLIC_SETTINGS_API_URL || '';
}

class TenantSettingsService {
  private static instance: TenantSettingsService;

  private constructor() {}

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
    const base = apiBase();
    if (!base) {
      return null;
    }
    try {
      const res = await fetch(`${base}/tenant_settings/${tenant}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as Record<string, any>;
      return data[key] ?? null;
    } catch (error) {
      console.error(`Error fetching tenant setting ${key}:`, error);
      throw error;
    }
  }

  async updateTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
    value: string
  ): Promise<void> {
    const base = apiBase();
    if (!base) {
      return;
    }
    try {
      const res = await fetch(`${base}/tenant_settings/${tenant}`, {

        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);

      }
    } catch (error) {
      console.error(`Error updating tenant setting ${key}:`, error);
      throw error;
    }
  }
}

export default TenantSettingsService;
