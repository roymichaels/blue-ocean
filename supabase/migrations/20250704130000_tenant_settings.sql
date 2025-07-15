/*
  # Create Tenant Settings Table

  1. New Table
    - tenant_settings: store branding settings per tenant

  2. Migration
    - Copy existing settings into tenant_settings for each tenant
*/

-- Create tenant_settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant text PRIMARY KEY,
  platform_name text,
  platform_logo text,
  theme_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read access for tenant_settings"
  ON tenant_settings FOR SELECT
  TO public
  USING (true);

-- Admin CRUD policies
CREATE POLICY "Admin insert access for tenant_settings"
  ON tenant_settings FOR INSERT
  TO public
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for tenant_settings"
  ON tenant_settings FOR UPDATE
  TO public
  USING (is_admin());

CREATE POLICY "Admin delete access for tenant_settings"
  ON tenant_settings FOR DELETE
  TO public
  USING (is_admin());

-- updated_at trigger
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert defaults for known tenants
INSERT INTO tenant_settings (tenant, platform_name, platform_logo, theme_color)
VALUES
  ('thecongress',
    (SELECT value FROM settings WHERE key = 'platform_name' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'platform_logo' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'theme_color' LIMIT 1)
  ),
  ('thebull',
    (SELECT value FROM settings WHERE key = 'platform_name' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'platform_logo' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'theme_color' LIMIT 1)
  )
ON CONFLICT (tenant) DO NOTHING;
