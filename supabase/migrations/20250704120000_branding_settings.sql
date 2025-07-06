/*
  # Add branding settings
  Insert default platform name, logo and theme color keys
*/

INSERT INTO settings (key, value, type, description) VALUES
  ('platform_name', 'Zionist Congress', 'string', 'Name of the platform')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, type, description) VALUES
  ('platform_logo', '', 'string', 'URL of platform logo')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, type, description) VALUES
  ('theme_color', '#B99C5A', 'string', 'Primary theme color')
ON CONFLICT (key) DO NOTHING;
