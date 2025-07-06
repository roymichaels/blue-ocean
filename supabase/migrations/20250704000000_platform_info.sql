/*
  # Add Platform Info Settings

  1. New Settings
    - platform_name: Name of the platform displayed across the app
    - platform_logo: URL for the platform logo
*/

INSERT INTO settings (key, value, type, description)
VALUES
  ('platform_name', 'Zionist Congress', 'string', 'Name of the platform'),
  ('platform_logo', '', 'string', 'URL of the platform logo')
ON CONFLICT (key) DO NOTHING;
